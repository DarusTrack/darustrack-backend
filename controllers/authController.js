const jwt       = require("jsonwebtoken");
const bcrypt    = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const NodeCache = require("node-cache");

const { User }  = require("../models");
const { generateAccessToken, generateRefreshToken } = require("../utils/tokenUtils");

const profileCache = new NodeCache({ stdTTL: 300 });           // 5-menit cache

/* ========= LOGIN ========= */
exports.login = asyncHandler(async (req, res) => {
  const { email = "", password = "" } = req.body;
  if (!email.trim() || !password) {
    return res.status(400).json({ message: "Email dan password harus diisi" });
  }

  // Ambil hanya kolom perlu
  const user = await User.findOne({
    where: { email },
    attributes: ["id", "name", "role", "password"],
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Email atau password salah" });
  }

  const payload = { id: user.id, name: user.name, role: user.role };

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
  });

  res.status(200).json({ message: "Login berhasil", accessToken, user: payload });
});

/* ========= REFRESH TOKEN ========= */
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Refresh token not found" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // Gunakan payload di token, tak perlu query DB
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token", error: err.message });
  }
});

/* ========= GET PROFILE ========= */
exports.getProfile = asyncHandler(async (req, res) => {
  const cacheKey = `profile:${req.user.id}`;
  const cached   = profileCache.get(cacheKey);
  if (cached) return res.json(cached);

  const user = await User.findByPk(req.user.id, {
    attributes: ["name", "nip", "email"],
  });
  if (!user) return res.status(404).json({ message: "User not found" });

  const profile = { name: user.name, nip: user.nip, email: user.email };
  profileCache.set(cacheKey, profile);           // simpan ke cache

  res.json(profile);
});

/* ========= UPDATE PROFILE ========= */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password, showPassword } = req.body;

  const updates = {};
  if (name)     updates.name  = name;
  if (email)    updates.email = email;
  if (password) updates.password = await bcrypt.hash(password, 10);

  const [affected] = await User.update(updates, { where: { id: req.user.id } });
  if (!affected) return res.status(404).json({ message: "User not found" });

  profileCache.del(`profile:${req.user.id}`);    // invalidasi cache

  res.json({
    message: "Profile updated successfully",
    email: email   || undefined,
    name:  name    || undefined,
    password: showPassword ? password : "********",
  });
});