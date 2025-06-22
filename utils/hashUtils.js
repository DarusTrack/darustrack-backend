const argon2 = require('argon2');

// opsi default diambil dari ENV (bisa di-override)
const defaultOpts = {
  type: argon2.argon2id,
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || 65536, 10),
  timeCost:    parseInt(process.env.ARGON2_TIME_COST    || 3,      10),
  parallelism: parseInt(process.env.ARGON2_PARALLELISM  || 1,      10)
};

exports.hashPassword = (plain, opts = defaultOpts) => argon2.hash(plain, opts);

exports.verifyPassword = (hash, plain, opts = defaultOpts) =>
  argon2.verify(hash, plain, opts);

exports.needsRehash = (hash, opts = defaultOpts) =>
  argon2.needsRehash ? argon2.needsRehash(hash, opts) : false;
