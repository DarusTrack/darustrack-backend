const express = require('express');
const router = express.Router();
const Validator = require('fastest-validator');
const { User } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

// Get daftar pengguna berdasarkan role
router.get('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { role } = req.query;

    let whereClause = {};
    if (role) whereClause.role = role;

    try {
        const users = await User.findAll({
            where: whereClause,
            attributes: {
                exclude: ["password", "createdAt", "updatedAt", "resetPasswordToken", "resetPasswordExpires"]
            },
            order: [['name', 'ASC']]
        });

        return res.json(users);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving users', error });
    }
});

// Get pengguna berdasarkan ID
router.get('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;

    try {
        const user = await User.findByPk(id, {
            attributes: {
                exclude: ["password", "createdAt", "updatedAt", "resetPasswordToken", "resetPasswordExpires"]
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json(user);
    } catch (error) {
        return res.status(500).json({ message: "Error retrieving user", error });
    }
});

// Tambah pengguna baru
router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
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

    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    try {
        if (req.body.nip !== undefined && req.body.nip.trim() === '') {
            req.body.nip = null;
        }

        const user = await User.create(req.body); // Password akan di-hash via hook
        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0]?.path;
            return res.status(400).json({ message: `${field} already exists.` });
        }

        res.status(500).json({ message: 'Error registering user', error });
    }
});

// Update pengguna
router.put('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
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
        role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'], optional: true },
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    if (req.body.nip !== undefined && req.body.nip.trim() === '') {
        req.body.nip = null;
    }

    user = await user.update(req.body); // Password akan di-hash via hook if changed
    res.json(user);
});

// Hapus pengguna
router.delete('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const user = await User.findByPk(id);

    if (!user) {
        return res.json({ message: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User is deleted' });
});

module.exports = router;
