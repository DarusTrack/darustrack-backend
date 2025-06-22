const redis = require('../utils/redisClient');
const sequelize = require('../models').sequelize;
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email & password wajib." });

  const t = await sequelize.transaction();   // optional: consistent reads
  try {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'name', 'role', 'password'],
      raw: true,
      transaction: t
    });
    if (!user) return res.status(401).json({ message: "Email / password salah" });

    // bcrypt di thread-pool besar
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Email / password salah" });

    // masukkan claim yang sering dipakai
    const payload = { id: user.id, name: user.name, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(payload),
      generateRefreshToken(payload)
    ]);

    // cache profil 1 jam
    await redis.setEx(`user:${user.id}`, 3600, JSON.stringify(payload));

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.status(200).json({ message: "Login berhasil", accessToken, user: payload });
    await t.commit();
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Refresh token controller
exports.refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) return res.status(401).json({ message: "Refresh token not found" });

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(403).json({ message: "Invalid refresh token", error: error.message });
    }
};

// Get user profile controller
exports.getProfile = async (req, res) => {
  const cacheKey = `user:${req.user.id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));          // <1 ms

  // fallback (jarang terjadi)
  const user = await User.findByPk(req.user.id, {
    attributes: ['id','name','nip','email'],
    raw: true
  });
  if (!user) return res.status(404).json({ message: "User not found" });

  await redis.setEx(cacheKey, 3600, JSON.stringify(user));
  res.json(user);
};

// Update profile controller
exports.updateProfile = async (req, res) => {
    const { name, email, password, showPassword } = req.body;

    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update user data
        if (name) user.name = name;
        if (email) user.email = email;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        res.json({
            message: "Profile updated successfully",
            email: email,
            name: name,
            password: showPassword ? password : "********",
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};