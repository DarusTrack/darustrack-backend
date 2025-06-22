// controllers/authController.js
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const { setAuthCookie } = require('../utils/cookieUtils');

// ---------- LOGIN ----------
exports.login = asyncHandler(async (req, res) => {
  const { email = '', password = '' } = req.body;
  if (!email.trim() || !password) {
    return res.status(400).json({ message: 'Email dan password harus diisi' });
  }

  /* 1️⃣ Ambil user sebagai plain object */
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    attributes: ['id', 'name', 'role', 'password'],
    raw: true,
  });
  if (!user || user.password.length < 60) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  /* 2️⃣ Paralelkan verifikasi & pembuatan token */
  const [isValid, tokens] = await Promise.all([
    bcrypt.compare(password, user.password),
    (async () => {
      const [at, rt] = await Promise.all([
        generateAccessToken(user),
        generateRefreshToken(user),
      ]);
      return { at, rt };
    })(),
  ]);

  if (!isValid) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  setAuthCookie(res, tokens.rt);
  return res.status(200).json({
    message: 'Login berhasil',
    accessToken: tokens.at,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// ---------- REFRESH TOKEN ----------
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token not found' });

  const { id } = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findByPk(id, { attributes: ['id', 'name', 'role'], raw: true });
  if (!user) return res.status(404).json({ message: 'User not found' });

  return res.json({ accessToken: generateAccessToken(user) });
});

// ---------- GET PROFILE ----------
exports.getProfile = asyncHandler(async (req, res) => {
  const cacheKey = `profile:${req.user.id}`;
  const redis = req.app.locals.cache;           //(*optional*) inject redis instance

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  }

  const user = await User.findByPk(req.user.id, {
    attributes: ['name', 'nip', 'email'],
    raw: true,
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (redis) await redis.setex(cacheKey, 30, JSON.stringify(user)); // TTL 30 s
  return res.json(user);
});

// ---------- UPDATE PROFILE ----------
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password, showPassword } = req.body;
  if (!name && !email && !password) {
    return res.status(400).json({ message: 'Tidak ada data di-update' });
  }

  const payload = {};
  if (name) payload.name = name;
  if (email) payload.email = email;
  if (password) payload.password = await bcrypt.hash(password, 10);

  await User.update(payload, { where: { id: req.user.id } });

  // hapus cache profil jika ada
  req.app.locals.cache?.del(`profile:${req.user.id}`);

  res.json({
    message: 'Profile updated successfully',
    email: payload.email,
    name: payload.name,
    password: password ? (showPassword ? password : '********') : undefined,
  });
});
