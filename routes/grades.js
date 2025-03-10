var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Grade, Student, Subject } = require('../models');
const accessValidation = require('../middleware/accessValidation');
const roleValidation = require('../middleware/roleValidation');
const v = new Validator();

// Fungsi untuk mengecek apakah UAS atau UTS sudah ada
async function isExamExists(student_id, subject_id, type) {
    return await Grade.findOne({ where: { student_id, subject_id, type } }) !== null;
}

// Get semua nilai
router.get('/', accessValidation, async (req, res) => {
    const { students_id, subject_id, type } = req.query;

    // Buat objek filter berdasarkan parameter yang diberikan
    let whereClause = {};
    if (students_id) whereClause.students_id = students_id;
    if (subject_id) whereClause.subject_id = subject_id;
    if (type) whereClause.type = type;

    try {
        const grades = await Grade.findAll({
            where: whereClause,
            include: [
                { model: Student, as: 'student', attributes: ['id', 'name'] },
                { model: Subject, as: 'subject', attributes: ['id', 'name'] }
            ]
        });
        return res.json(grades);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving grades', error });
    }
});

// Get nilai berdasarkan ID
router.get('/:id', accessValidation, async (req, res) => {
    const id = req.params.id;
    const grade = await Grade.findByPk(id, {
        include: [
            { model: Student, as: 'student', attributes: ['id', 'name'] },
            { model: Subject, as: 'subject', attributes: ['id', 'name'] }
        ]
    });

    if (!grade) {
        return res.status(404).json({ message: 'Grade not found' });
    }

    return res.json(grade);
});

// Tambah nilai baru
router.post('/', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const schema = {
        student_id: 'number',
        subject_id: 'number',
        type: { type: 'enum', values: ['Quiz', 'Tugas', 'UTS', 'UAS'] },
        score: 'number|min:0|max:100',
        date: { type: 'date', convert: true }
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    const { student_id, subject_id, type } = req.body;

    if (type === 'UTS' || type === 'UAS') {
        if (await isExamExists(student_id, subject_id, type)) {
            return res.status(400).json({ message: `${type} score already exists for this student and subject` });
        }
    }

    const grade = await Grade.create(req.body);
    res.json(grade);
});

// Update nilai
router.put('/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const id = req.params.id;

    let grade = await Grade.findByPk(id);
    if (!grade) {
        return res.status(404).json({ message: 'Grade not found' });
    }

    const schema = {
        student_id: 'number|optional',
        subject_id: 'number|optional',
        type: { type: 'enum', values: ['Quiz', 'Tugas', 'UTS', 'UAS'], optional: true },
        score: 'number|min:0|max:100|optional',
        date: 'date|optional'
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    if ((req.body.type === 'UTS' || req.body.type === 'UAS') && req.body.type !== grade.type) {
        if (await isExamExists(grade.student_id, grade.subject_id, req.body.type)) {
            return res.status(400).json({ message: `${req.body.type} score already exists for this student and subject` });
        }
    }

    grade = await grade.update(req.body);
    res.json(grade);
});

// Hapus nilai
router.delete('/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const id = req.params.id;
    const grade = await Grade.findByPk(id);

    if (!grade) {
        return res.status(404).json({ message: 'Grade not found' });
    }

    await grade.destroy();
    res.json({ message: 'Grade is deleted' });
});

module.exports = router;
