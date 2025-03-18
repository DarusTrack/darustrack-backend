var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Student, Evaluations } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');

// Get semua evaluasi
router.get('/', accessValidation, roleValidation(["wali_kelas", "admin"]), async (req, res) => {
    const { student_id } = req.query;

    // Buat objek filter berdasarkan parameter yang diberikan
    let whereClause = {};
    if (student_id) whereClause.student_id = student_id;

    try {
        const evaluations = await Evaluations.findAll({
            where: whereClause,
            include: [
                { model: Student, as: 'student', attributes: ['id', 'name'] }
            ]
        });
        return res.json(evaluations);
    }  catch (error) {
        return res.status(500).json({ message: 'Error retrieving student evaluations', error });
    }
});

// Get evaluasi berdasarkan ID
router.get('/:id', accessValidation, roleValidation(["wali_kelas", "admin"]), async (req, res) => {
    const id = req.params.id;
    const evaluations = await Evaluations.findByPk(id, {
        include: [
            { model: Student, as: 'student', attributes: ['id', 'name'] }
        ]
    });

    if (!evaluations) {
        return res.status(404).json({ message: 'Evaluation not found' });
    }

    return res.json(evaluations);
});

// Tambah evaluasi baru
router.post('/', accessValidation, roleValidation(["wali_kelas", "admin"]), async (req, res) => {
    const schema = {
        student_id: 'number',
        title:{ type: "enum", values: ["Mengenai Perilaku Anak", "Hasil Evaluasi Belajar Anak"]},
        description: 'string'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const evaluations = await Evaluations.create(req.body);
    res.json(evaluations);
});

// Update evaluasi
router.put('/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const id = req.params.id;

    let evaluations = await Evaluations.findByPk(id);
    if (!evaluations) {
        return res.status(404).json({ message: 'Student Evaluation not found' });
    }

    const schema = {
        student_id: 'number|optional',
        title: { type: "enum", values: ["Mengenai Perilaku Anak", "Hasil Evaluasi Belajar Anak"]},
        description: 'string|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    evaluations = await Evaluations.update(req.body);
    res.json(evaluations);
});

// Hapus evaluasi
router.delete('/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const id = req.params.id;
    const evaluations = await Evaluations.findByPk(id);

    if (!evaluations) {
        return res.status(404).json({ message: 'Student Evaluation not found' });
    }

    await evaluations.destroy();
    res.json({ message: 'Student Evaluation is deleted' });
});

module.exports = router;
