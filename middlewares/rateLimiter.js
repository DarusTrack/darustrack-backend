const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5, // max 5 requests per IP per windowMs
  message: "Terlalu banyak percobaan login. Coba lagi nanti.",
});

module.exports = loginLimiter;
