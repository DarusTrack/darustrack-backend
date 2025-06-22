// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');          // ✔︎ ganti argon2 jika ingin lebih cepat
const { User } = require('../models');
const { sequelize } = require('../models');
const redis = require('../utils/redisClient');
const {
  generateAccessToken,
  generateRefreshToken
} = require('../utils/tokenUtils');

// helper – uniform response & log
const sendError = (res, status, msg, err = null) => {
  if (err) console.error('[AUTH]', err);
  return res.status(status).json({ message: msg });
};

// ---------- LOGIN ----------
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return sendError(res, 400, 'Email & password wajib.');

  try {
    // ① ambil user (gunakan index UNIQUE email di DB)
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'name', 'role', 'password'],
      raw: true
    });
    if (!user) return sendError(res, 401, 'Email / password salah');

    // ② verifikasi password di thread-pool besar
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return sendError(res, 401, 'Email / password salah');

    // ③ siapkan payload ringan (tanpa password)
    const payload = { id: user.id, name: user.name, role: user.role };

    // ④ sign token paralel
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(payload),
      generateRefreshToken(payload)
    ]);

    // ⑤ cache profil 60 menit (tidak simpan password)
    await redis.set(`user:${user.id}`, JSON.stringify(payload), { EX: 3600 });

    // ⑥ set HTTPCookie - refreshToken
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({ message: 'Login berhasil', accessToken, user: payload });
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
};

// ---------- REFRESH TOKEN ----------
exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return sendError(res, 401, 'Refresh token not found');

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const cacheKey = `user:${decoded.id}`;

    // ambil profil dari cache lebih dulu
    let user = await redis.get(cacheKey);
    if (user) user = JSON.parse(user);
    else {
      // fallback DB (jarang sekali)
      const dbUser = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'role'],
        raw: true
      });
      if (!dbUser) return sendError(res, 404, 'User not found');
      user = dbUser;
      await redis.set(cacheKey, JSON.stringify(user), { EX: 3600 });
    }

    const newAccessToken = generateAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return sendError(res, 403, 'Invalid refresh token', err);
  }
};

// ---------- GET PROFILE ----------
exports.getProfile = async (req, res) => {
  const cacheKey = `user:${req.user.id}`;

  // ① coba dari Redis
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  // ② fallback DB
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'name', 'nip', 'email', 'role'],
    raw: true
  });
  if (!user) return sendError(res, 404, 'User not found');

  await redis.set(cacheKey, JSON.stringify(user), { EX: 3600 });
  return res.json(user);
};

// ---------- UPDATE PROFILE ----------
exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 8); // saltRounds diturunkan

    await user.save();

    // sinkronkan cache
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    await redis.set(`user:${user.id}`, JSON.stringify(payload), { EX: 3600 });

    return res.json({ message: 'Profile updated successfully', user: payload });
  } catch (err) {
    return sendError(res, 500, 'Internal server error', err);
  }
};
