const tokenBlacklist = new Set();

module.exports = {
    add: (token) => tokenBlacklist.add(token),
    isBlacklisted: (token) => tokenBlacklist.has(token),
};
