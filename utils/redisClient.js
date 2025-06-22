const { createClient } = require('redis');

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('❌ Redis Client Error', err));

redis.connect()
    .then(() => console.log('✅ Redis connected'))
    .catch(err => console.error('❌ Redis connect failed:', err));

module.exports = redis;
