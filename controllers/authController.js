const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const bcrypt = require('bcryptjs');                  // hanya dipakai untuk migrasi
const redis = require('../utils/redisClient');
const { User, sequelize } = require('../models');
const {
  generateAccessToken,
  generateRefreshToken
} = require('../utils/tokenUtils');

/* ----------  PARAMETER ARGON2  ---------- */
const ARGON2_OPTS = {
  type: argon2.argon2id,                    // varian teraman
  memoryCost : parseInt(process.env.ARGON2_MEMORY_COST  || 65536, 10), // 64 MB
  timeCost   : parseInt(process.env.ARGON2_TIME_COST     || 3,     10),
  parallelism: parseInt(process.env.ARGON2_PARALLELISM   || 1,     10)
};

/* ----------  UTIL ---------- */
const isBcrypt = h => /^\$2[aby]\$/.test(h);
const sendErr  = (res, s, m, e = null) => {
  if (e) console.error('[AUTH]', e);
  return res.status(s).json({ message: m });
};

/* ----------  LOGIN ---------- */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return sendErr(res, 400, 'Email & password wajib.');

  try {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'name', 'role', 'password'],
      raw: true
    });
    if (!user) return sendErr(res, 401, 'Email / password salah');

    /* --- verifikasi & migrasi otomatis bcrypt → argon2 --- */
    let valid = false;

    if (isBcrypt(user.password)) {
      valid = await bcrypt.compare(password, user.password);
      if (valid) {
        // re-hash dgn argon2 & simpan ke DB (non-blocking)
        const hash = await argon2.hash(password, ARGON2_OPTS);
        await User.update({ password: hash }, { where: { id: user.id } });
        user.password = hash;
      }
    } else {
      valid = await argon2.verify(user.password, password, ARGON2_OPTS);
      // periksa apakah perlu rehash karena param berubah
      if (valid && argon2.needsRehash(user.password, ARGON2_OPTS)) {
        const hash = await argon2.hash(password, ARGON2_OPTS);
        await User.update({ password: hash }, { where: { id: user.id } });
        user.password = hash;
      }
    }

    if (!valid) return sendErr(res, 401, 'Email / password salah');

    /* --- buat token & cache profil --- */
    const payload = { id: user.id, name: user.name, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(payload),
      generateRefreshToken(payload)
    ]);

    await redis.set(`user:${user.id}`, JSON.stringify(payload), { EX: 3600 });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure  : process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge  : 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ message: 'Login berhasil', accessToken, user: payload });
  } catch (err) {
    return sendErr(res, 500, 'Server error', err);
  }
};

/* ----------  REFRESH TOKEN ---------- */
exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return sendErr(res, 401, 'Refresh token not found');

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const cacheKey = `user:${decoded.id}`;

    let user = await redis.get(cacheKey);
    if (user) user = JSON.parse(user);
    else {
      user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'role'],
        raw: true
      });
      if (!user) return sendErr(res, 404, 'User not found');
      await redis.set(cacheKey, JSON.stringify(user), { EX: 3600 });
    }

    const newAccessToken = generateAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return sendErr(res, 403, 'Invalid refresh token', err);
  }
};

/* ----------  GET PROFILE ---------- */
exports.getProfile = async (req, res) => {
  const cacheKey = `user:${req.user.id}`;

  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'name', 'nip', 'email', 'role'],
    raw: true
  });
  if (!user) return sendErr(res, 404, 'User not found');

  await redis.set(cacheKey, JSON.stringify(user), { EX: 3600 });
  return res.json(user);
};

/* ----------  UPDATE PROFILE ---------- */
exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return sendErr(res, 404, 'User not found');

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = await argon2.hash(password, ARGON2_OPTS);

    await user.save();

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    await redis.set(`user:${user.id}`, JSON.stringify(payload), { EX: 3600 });

    return res.json({ message: 'Profile updated successfully', user: payload });
  } catch (err) {
    return sendErr(res, 500, 'Internal server error', err);
  }
};
