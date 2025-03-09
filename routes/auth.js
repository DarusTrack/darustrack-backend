var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const Validator = require('fastest-validator');
require('dotenv').config();
const v = new Validator();

// // Registrasi Pengguna
// router.post('/register', async (req, res) => {
//     const schema = {
//         name: 'string',
//         email: 'email',
//         password: 'string|min:6',
//         role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'] }
//     };

//     const validate = v.validate(req.body, schema);
//     if (validate.length) {
//         return res.status(400).json(validate);
//     }

//     // Cek apakah email sudah terdaftar
//     const existingUser = await User.findOne({ where: { email: req.body.email } });
//     if (existingUser) {
//         return res.status(400).json({ message: 'Email already registered' });
//     }

//     // Hash password sebelum menyimpan
//     req.body.password = await bcrypt.hash(req.body.password, 10);
    
//     const user = await User.create(req.body);
//     res.json({ message: 'User registered successfully', user });
// });

// Login Pengguna
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Cek apakah email ada
    const user = await User.findOne({ where: { email } });
    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Cek password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Buat token
    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ message: 'Login successful', token });
});

// Middleware untuk melindungi rute
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied, token missing!' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Get Profile (hanya user yang login)
router.get('/profile', authMiddleware, async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
    });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
});

module.exports = router;
