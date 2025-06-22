// controllers/authController.js
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const NodeCache = require('node-cache');
const profileCache = new NodeCache({ stdTTL: 300 });
const { User } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

/* ---------- LOGIN ---------- */
exports.login = asyncHandler(async (req, res) => {
  const { email = '', password = '' } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password harus diisi' });
  }

  // Ambil user + password saja (pakai scope)
  const user = await User.scope('withPassword').findOne({
    where: { email },
    raw: true,            // lewati instance Sequelize → lebih cepat
  });
  if (!user) return res.status(401).json({ message: 'Email atau password salah' });

  // Bcrypt async
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Email atau password salah' });

  // Hilangkan password sebelum dipakai di payload / token
  delete user.password;

  // Parallel generate token (non-blocking)
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });

  res.json({ message: 'Login berhasil', accessToken, user });
});

/* ---------- REFRESH TOKEN ---------- */
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Refresh token not found' });

  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findByPk(decoded.id, { raw: true });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const accessToken = await generateAccessToken(user);
  res.json({ accessToken });
});

/* ---------- GET PROFILE (dengan cache) ---------- */
exports.getProfile = asyncHandler(async (req, res) => {
  const cacheKey = `profile_${req.user.id}`;
  const cached = profileCache.get(cacheKey);
  if (cached) return res.json(cached);

  const user = await User.findByPk(req.user.id, {
    attributes: ['name', 'nip', 'email'],
    raw: true,
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  profileCache.set(cacheKey, user);
  res.json(user);
});

/* ---------- UPDATE PROFILE ---------- */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (name) user.name = name;
  if (email) user.email = email;
  if (password) user.password = await bcrypt.hash(password, 10);
  await user.save();

  // Invalidate cache
  profileCache.del(`profile_${req.user.id}`);

  res.json({ message: 'Profile updated successfully' });
});
