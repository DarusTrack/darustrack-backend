const express = require('express');
const router = express.Router();
const Validator = require('fastest-validator');
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const v = new Validator();

// Helper error wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Excluded user attributes (to avoid repetition)
const excludedAttributes = ["password", "createdAt", "updatedAt", "resetPasswordToken", "resetPasswordExpires"];

// GET / - List users by role
router.get('/', asyncHandler(async (req, res) => {
    const { role } = req.query;
    const whereClause = role ? { role } : {};

    const users = await User.findAll({
        where: whereClause,
        attributes: { exclude: excludedAttributes },
        order: [['name', 'ASC']]
    });

    res.json(users);
}));

// GET /:id - Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
        attributes: { exclude: excludedAttributes }
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
}));

// POST / - Create user
router.post('/', asyncHandler(async (req, res) => {
    const schema = {
        name: 'string',
        nip: 'string|optional',
        email: 'email',
        password: 'string|min:6',
        role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'] }
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) return res.status(400).json(validate);

    const { email, password, nip, ...rest } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        ...rest,
        email,
        nip: nip?.trim() || null,
        password: hashedPassword
    });

    res.status(201).json({ message: 'User registered successfully', user });
}));

// PUT /:id - Update user
router.put('/:id', asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const schema = {
        name: 'string|optional',
        nip: 'string|optional',
        email: 'email|optional',
        password: 'string|min:6|optional',
        role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'], optional: true },
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) return res.status(400).json(validate);

    const updatePayload = { ...req.body };

    if (updatePayload.password) {
        updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
    }

    if (updatePayload.nip !== undefined && updatePayload.nip.trim() === '') {
        updatePayload.nip = null;
    }

    await user.update(updatePayload);
    res.json(user);
}));

// DELETE /:id - Delete user
router.delete('/:id', asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.destroy();
    res.json({ message: 'User is deleted' });
}));

module.exports = router;