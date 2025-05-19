const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

const loginRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    expiry: 60, // seconds
  }),
  windowMs: 60 * 1000,
  max: 5,
  message: {
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginRateLimiter;
