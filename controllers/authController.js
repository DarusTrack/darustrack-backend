const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, PasswordReset } = require("../models");
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const crypto = require("crypto");
require("dotenv").config();

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

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email dan password harus diisi" });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ message: "Login successful", accessToken });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

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

exports.requestReset = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordReset.create({
        user_id: user.id,
        token,
        expires_at: expiresAt,
    });

    res.json({ message: "Gunakan link berikut untuk reset password", link: `https://darustrack.vercel.app/reset-password?token=${token}` });
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    const resetRequest = await PasswordReset.findOne({ where: { token } });
    if (!resetRequest || new Date(resetRequest.expires_at) < new Date()) {
        return res.status(400).json({ message: "Token tidak valid atau sudah kedaluwarsa" });
    }

    const user = await User.findByPk(resetRequest.user_id);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await PasswordReset.destroy({ where: { token } });

    res.json({ message: "Password berhasil direset. Silakan login kembali dengan password baru!" });
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

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
};

exports.updateProfile = async (req, res) => {
    const { name, email, password, showPassword } = req.body;

    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

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

exports.logout = (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ message: "Logout successful" });
};