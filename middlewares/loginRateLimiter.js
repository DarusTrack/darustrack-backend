const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5, // Maksimal 5 percobaan login per menit per IP
  message: {
    message: "Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam 1 menit.",
  },
  standardHeaders: true, // Mengaktifkan header RateLimit-*
  legacyHeaders: false,  // Menonaktifkan X-RateLimit-* header (sudah deprecated)
});

module.exports = loginRateLimiter;
