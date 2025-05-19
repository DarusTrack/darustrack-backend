const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const Validator = require("fastest-validator");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const v = new Validator();
require("dotenv").config();

// Rate Limiter untuk login
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 5, // max 5 kali per menit
    message: "Terlalu banyak percobaan login. Coba lagi nanti.",
});

// === Helper ===
function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );
}

// === Login ===
router.post("/login", loginLimiter, async (req, res) => {
    const schema = {
        email: { type: "email" },
        password: { type: "string", min: 6 },
    };
    const validation = v.validate(req.body, schema);
    if (validation !== true) return res.status(400).json({ errors: validation });

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) return res.status(401).json({ message: "Email atau password salah" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: "Email atau password salah" });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ message: "Login sukses", accessToken });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// === Refresh Token ===
router.post("/refresh-token", async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Token tidak ditemukan" });

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findByPk(decoded.id);
        if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

        const accessToken = generateAccessToken(user);
        res.json({ accessToken });
    } catch (error) {
        res.status(403).json({ message: "Token refresh tidak valid", error: error.message });
    }
});

// === Logout ===
router.post("/logout", (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ message: "Berhasil logout" });
});

// Get Profile (Hanya bisa dilakukan oleh user yang login)
router.get("/profile", accessValidation, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Tambahkan opsi untuk menampilkan password sebelum di-hash
        res.json({
            name: user.name,
            nip: user.nip,
            email: user.email,
            password: "********",
        });
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update Profile (Hanya bisa dilakukan oleh user yang login)
router.put("/profile", accessValidation, async (req, res) => {
    const { name, email, password, showPassword } = req.body;

    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update data pengguna
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
});

module.exports = router;
