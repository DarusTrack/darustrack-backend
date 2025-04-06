var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const accessValidation = require("../middlewares/accessValidation");
const tokenBlacklist = require("../middlewares/tokenBlacklist");
const Validator = require("fastest-validator");
require("dotenv").config();
const v = new Validator();

// Login Pengguna
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        console.log("Email atau password tidak diisi.");
        return res.status(400).json({ message: "Email dan password harus diisi" });
    }

    try {
        console.log("Mencari user dengan email:", email);
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("User tidak ditemukan.");
            return res.status(400).json({ message: "Invalid email or password" });
        }

        console.log("Memeriksa password...");
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log("Password tidak valid.");
            return res.status(400).json({ message: "Invalid email or password" });
        }

        console.log("Membuat token JWT...");
        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ message: "Login successful", token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
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
            password: "********", // Password tetap tersembunyi secara default
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
            password: showPassword ? password : "********", // Jika showPassword true, tampilkan password baru
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
