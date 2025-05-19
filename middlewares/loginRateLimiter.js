const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, // 1 menit
  max: 5, // Maksimal 5 percobaan per IP per menit
  message: {
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginRateLimiter;
