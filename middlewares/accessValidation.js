// middleware/accessValidation.js
const jwt = require('jsonwebtoken');

function accessValidation(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Simpan info user ke req.user
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token tidak valid atau kedaluwarsa." });
  }
}

module.exports = accessValidation;