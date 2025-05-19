const rateLimit = require('express-rate-limit');
const rateLimitRedis = require('rate-limit-redis');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

const loginRateLimiter = rateLimit({
  store: rateLimitRedis({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, // 1 menit
  max: 5, // Maksimal 5 request per IP
  message: {
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginRateLimiter;
