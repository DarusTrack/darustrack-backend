const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const { setAuthCookie } = require('../utils/cookieUtils');

// ---------- LOGIN ----------
exports.login = asyncHandler(async (req, res) => {
  const { email = '', password = '' } = req.body;

  // 1. Validasi input (pakai middleware schema di layer lain → double safety di sini)
  if (!email.trim() || !password) {
    return res.status(400).json({ message: 'Email dan password harus diisi' });
  }

  // 2. Ambil user (plain object)
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    attributes: ['id', 'name', 'role', 'password'],
    raw: true,
  });

  // 3. Cek keberadaan + verifikasi hash
  const isValid =
    user &&
    user.password?.length >= 8 &&
    (await bcrypt.compare(password, user.password));

  if (!isValid) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  // 4. Generate token paralel
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);

  // 5. Pasang cookie refresh token
  setAuthCookie(res, refreshToken);

  // 6. Balas
  res.status(200).json({
    message: 'Login berhasil',
    accessToken,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// ---------- REFRESH TOKEN ----------
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Refresh token not found' });

  const { id } = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findByPk(id, { attributes: ['id', 'role', 'name'], raw: true });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const accessToken = generateAccessToken(user);
  res.json({ accessToken });
});

// ---------- GET PROFILE ----------
exports.getProfile = asyncHandler(async (req, res) => {
  const cached = await req.app.locals.cache.get(`profile:${req.user.id}`); // Redis optional
  if (cached) return res.json(cached);

  const user = await User.findByPk(req.user.id, {
    attributes: ['name', 'nip', 'email'],
    raw: true,
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  await req.app.locals.cache.set(`profile:${req.user.id}`, user, 30); // TTL 30 s
  res.json({ ...user, password: '********' });
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

  // wajib hapus cache profil agar fresh
  await req.app.locals.cache.del(`profile:${req.user.id}`);

  res.json({
    message: 'Profile updated successfully',
    ...payload,
    password: password ? (showPassword ? password : '********') : undefined,
  });
});
