var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, PasswordReset } = require("../models");
const accessValidation = require("../middlewares/accessValidation");
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const crypto = require("crypto");
require("dotenv").config();

// Optimasi: Turunkan cost factor bcrypt (disesuaikan dengan kebutuhan keamanan)
const BCRYPT_COST_FACTOR = 8;

// Optimasi: Gunakan algoritma yang lebih cepat untuk JWT
const JWT_ALGORITHM = 'HS256';

const nodemailer = require('nodemailer');

function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            role: user.role // Minimalkan payload token
        },
        process.env.JWT_SECRET,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
        }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_SECRET,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
        }
    );
}

const transporter = nodemailer.createTransport({
    host: "gmail",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendResetPasswordEmail(to, name, link) {
    const info = await transporter.sendMail({
        from: `"DarusTrack Team" <${process.env.EMAIL_USER}>`,
        to,
        subject: "DarusTrack Password Reset",
        html: `
            <h1>Salam ${name},</h1>
            <p>Kami menerima permintaan untuk mereset password Anda. Silakan klik tautan di bawah ini untuk mengatur ulang password:</p>
            <a href="${link}">${link}</a>
            <p>Link di atas hanya dapat digunakan selama 1 jam.</p>
            <br>
            <p>Bila Anda tidak pernah meminta proses reset password, mohon abaikan email ini.</p>
            <p>Terima kasih,</p>
            <p>DarusTrack</p>
        `
    });

    console.log("Email sent: ", info.messageId);
}

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
        return res.status(400).json({ message: "Email dan password harus diisi" });
    }

    try {
        // Optimasi query: Ambil hanya field yang diperlukan
        const user = await User.findOne({
            where: { email },
            attributes: ['id', 'password', 'role', 'email'] // Jangan bawa data tidak perlu
        });

        if (!user) {
            // Gunakan pesan error generik untuk keamanan
            return res.status(401).json({ message: "Kredensial tidak valid" });
        }

        // Optimasi: Bandingkan password dengan bcrypt
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: "Kredensial tidak valid" });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Set cookie dengan refresh token
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Response tanpa data sensitif
        res.status(200).json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('[Auth Error]', error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server"
        });
    }
});

// refresh token
router.post("/refresh-token", async (req, res) => {
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

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required." });

    try {
        const user = await User.findOne({ where: { email }, attributes: ['id', 'email', 'name'] });

        if (!user) {
            // Jangan beri tahu apakah email terdaftar demi keamanan
            return res.status(200).json({ message: "Bila email ada, maka email untuk mengubah password akan dikirim ke email yang Anda masukkan" });
        }

        // Buat token
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

        await PasswordReset.upsert({
            user_id: user.id,
            token,
            expires_at: expires
        });

        const resetLink = `https://darustrack.vercel.app/reset-password?token=${token}`;

        // Kirim email
        await sendResetPasswordEmail(user.email, user.name, resetLink);

        res.status(200).json({ message: "If the email exists, password reset link sent." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) return res.status(400).json({ message: "Token and password are required." });

    try {
        const resetEntry = await PasswordReset.findOne({ where: { token } });

        if (!resetEntry || resetEntry.expires_at < new Date()) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        const user = await User.findByPk(resetEntry.user_id);
        if (!user) return res.status(404).json({ message: "User not found." });

        user.password = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
        await user.save();

        // Hapus token agar tidak bisa digunakan ulang
        await resetEntry.destroy();

        res.status(200).json({ message: "Password updated successfully." });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
