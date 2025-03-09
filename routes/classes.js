var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Class, User, Student } = require('../models');
const v = new Validator();

// Get semua kelas
router.get('/', async (req, res) => {
    const { wali_kelas_id, level } = req.query;

    // Buat objek filter berdasarkan parameter yang diberikan
    let whereClause = {};
    if (wali_kelas_id) whereClause.wali_kelas_id = wali_kelas_id;
    if (level) whereClause.level = level;

    try {
        const classes = await Class.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'wali_kelas', attributes: ['id', 'name', 'email'] },
                { model: Student, as: 'students', attributes: ['id', 'name'] }
            ]
        });
        return res.json(classes);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving classes', error });
    }
});

// Get kelas berdasarkan ID
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const classData = await Class.findByPk(id, {
        include: [
            { model: User, as: 'wali_kelas', attributes: ['id', 'name', 'email'] },
            { model: Student, as: 'students', attributes: ['id', 'name'] }
        ]
    });

    if (!classData) {
        return res.status(404).json({ message: 'Class not found' });
    }

    return res.json(classData);
});

// Tambah kelas baru
router.post('/', async (req, res) => {
    const schema = {
        level: { type: 'enum', values: ['1', '2', '3', '4', '5', '6'] },
        name: 'string',
        wali_kelas_id: 'number'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const classData = await Class.create(req.body);
    res.json(classData);
});

// Update kelas
router.put('/:id', async (req, res) => {
    const id = req.params.id;

    let classData = await Class.findByPk(id);
    if (!classData) {
        return res.status(404).json({ message: 'Class not found' });
    }

    const schema = {
        level: {type: 'enum', values: ['1', '2', '3', '4', '5', '6']},
        name: 'string|optional',
        wali_kelas_id: 'number|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    classData = await classData.update(req.body);
    res.json(classData);
});

// Hapus kelas
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    const classData = await Class.findByPk(id);

    if (!classData) {
        return res.status(404).json({ message: 'Class not found' });
    }

    await classData.destroy();
    res.json({ message: 'Class is deleted' });
});

module.exports = router;
