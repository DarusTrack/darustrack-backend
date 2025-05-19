const redis = require('redis');
const client = redis.createClient();

const cacheUser = (req, res, next) => {
  const { email } = req.body;
  
  client.get(`user:${email}`, (err, data) => {
    if (err) return next();
    
    if (data) {
      req.cachedUser = JSON.parse(data);
      return next();
    }
    
    next();
  });
};

module.exports = cacheUser;