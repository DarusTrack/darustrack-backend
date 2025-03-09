var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Evaluation, Student, User } = require('../models');
const v = new Validator();

// Get semua evaluasi
router.get('/', async (req, res) => {
    const { student_id, teacher_id } = req.query;

    // Buat objek filter berdasarkan parameter yang diberikan
    let whereClause = {};
    if (student_id) whereClause.student_id = student_id;
    if (teacher_id) whereClause.teacher_id = teacher_id;

    try {
        const evaluations = await Evaluation.findAll({
            where: whereClause,
            include: [
                { model: Student, as: 'student', attributes: ['id', 'name'] },
                { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }
            ]
        });
        return res.json(evaluations);
    }  catch (error) {
        return res.status(500).json({ message: 'Error retrieving evaluations', error });
    }
});

// Get evaluasi berdasarkan ID
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const evaluation = await Evaluation.findByPk(id, {
        include: [
            { model: Student, as: 'student', attributes: ['id', 'name'] },
            { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }
        ]
    });

    if (!evaluation) {
        return res.status(404).json({ message: 'Evaluation not found' });
    }

    return res.json(evaluation);
});

// Tambah evaluasi baru
router.post('/', async (req, res) => {
    const schema = {
        student_id: 'number',
        teacher_id: 'number',
        title: { type: 'enum', values: ['Mengenai Perilaku Siswa', 'Hasil Evaluasi Belajar Siswa'] },
        comment: 'string|min:10|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const evaluation = await Evaluation.create(req.body);
    res.json(evaluation);
});

// Update evaluasi
router.put('/:id', async (req, res) => {
    const id = req.params.id;

    let evaluation = await Evaluation.findByPk(id);
    if (!evaluation) {
        return res.status(404).json({ message: 'Evaluation not found' });
    }

    const schema = {
        student_id: 'number|optional',
        teacher_id: 'number|optional',
        title: { type: 'enum', values: ['Mengenai Perilaku Siswa', 'Hasil Evaluasi Belajar Siswa'], optional: true },
        comment: 'string|min:10|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    evaluation = await evaluation.update(req.body);
    res.json(evaluation);
});

// Hapus evaluasi
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    const evaluation = await Evaluation.findByPk(id);

    if (!evaluation) {
        return res.status(404).json({ message: 'Evaluation not found' });
    }

    await evaluation.destroy();
    res.json({ message: 'Evaluation is deleted' });
});

module.exports = router;
