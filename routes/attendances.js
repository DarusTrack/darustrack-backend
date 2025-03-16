var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Attendance, Student } = require('../models');
const { accessValidation } = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const v = new Validator();

// Get semua kehadiran
router.get('/', accessValidation, async (req, res) => {
    const { student_id, status } = req.query;

    let whereClause = {};
    if (student_id) whereClause.student_id = student_id;
    if (status) whereClause.status = status;

    try {
        const attendances = await Attendance.findAll({
            where: whereClause,
            include: [
                { model: Student, as: 'student', attributes: ['id', 'name'] }
            ]
        });
        return res.json(attendances);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving attendances', error });
    }
});

// Get kehadiran berdasarkan ID
router.get('/:id', accessValidation, async (req, res) => {
    const id = req.params.id;
    const attendance = await Attendance.findByPk(id, {
        include: [
            { model: Student, as: 'student', attributes: ['id', 'name'] }
        ]
    });

    if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
    }

    return res.json(attendance);
});

// Tambah kehadiran baru
router.post('/', accessValidation, roleValidation(["wali_kelas", "admin"]), async (req, res) => {
    const schema = {
        student_id: 'number',
        date: {type: 'date', convert: true},
        status: { type: 'enum', values: ['hadir', 'izin', 'sakit', 'alfa'] }
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const attendance = await Attendance.create(req.body);
    res.json(attendance);
});

// Update kehadiran
router.put('/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const id = req.params.id;

    let attendance = await Attendance.findByPk(id);
    if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
    }

    const schema = {
        student_id: 'number|optional',
        date: 'date|optional',
        status: { type: 'enum', values: ['hadir', 'izin', 'sakit', 'alfa'], optional: true }
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    attendance = await attendance.update(req.body);
    res.json(attendance);
});

// Hapus kehadiran
router.delete('/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const id = req.params.id;
    const attendance = await Attendance.findByPk(id);

    if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
    }

    await attendance.destroy();
    res.json({ message: 'Attendance is deleted' });
});

module.exports = router;
