var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { User } = require('../models');
const bcrypt = require('bcrypt');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');

// Get semua pengguna
router.get('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { role } = req.query;

    // Objek filter berdasarkan parameter yang diberikan
    let whereClause = {};
    if (role) whereClause.role = role;

    try {
        const users = await User.findAll({ where: whereClause });
        return res.json(users);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving users', error });
    }
});

// Get pengguna berdasarkan ID
router.get('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const user = await User.findByPk(id);
    return res.json(user || {});
});

// Tambah pengguna baru (Register)
router.post('/', async (req, res) => {
    const schema = {
        name: 'string',
        nip: 'string|optional',
        email: 'email',
        password: 'string|min:6',
        role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'] }
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    // Simpan user tanpa melakukan hashing manual
    const user = await User.create(req.body);

    res.json({ message: 'User registered successfully', user });
});

// Update pengguna
router.put('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    
    let user = await User.findByPk(id);
    if (!user) {
        return res.json({ message: 'User not found' });
    }

    const schema = {
        name: 'string|optional',
        nip: 'string|optional',
        email: 'email|optional',
        password: 'string|min:6|optional',
        role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'], optional: true }
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    // Hash password jika diupdate
    if (req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    user = await user.update(req.body);
    res.json(user);
});

// Hapus pengguna
router.delete('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const user = await User.findByPk(id);

    if (!user) {
        return res.json({ message: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User is deleted' });
});

module.exports = router;
