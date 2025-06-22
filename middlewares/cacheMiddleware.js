// middlewares/cacheMiddleware.js
const cache = require('../utils/cache');

function cacheMiddleware(duration = 60) {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = cache.get(key);
    if (cachedBody) {
      return res.json(cachedBody);
    } else {
      res.originalJson = res.json;
      res.json = (body) => {
        cache.set(key, body, duration);
        res.originalJson(body);
      };
      next();
    }
  };
}

module.exports = cacheMiddleware;
