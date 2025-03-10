var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Student, Class, User } = require('../models');
const v = new Validator();
const roleValidation = require("../middleware/roleValidation");
const accessValidation = require('../middleware/accessValidation');

// Get semua siswa
router.get('/',  accessValidation, roleValidation(["admin", "wali_kelas"]), async (req, res) => {
    const students = await Student.findAll({ 
        include: [
            { model: Class, as: 'class' },
            { model: User, as: 'guardian', attributes: ['id', 'name', 'email'] }
        ]
    });
    return res.json(students);
});

// Get siswa berdasarkan ID
router.get('/:id', accessValidation, async (req, res) => {
    const id = req.params.id;
    const student = await Student.findByPk(id, { 
        include: [
            { model: Class, as: 'class' },
            { model: User, as: 'guardian', attributes: ['id', 'name', 'email'] }
        ]
    });
    
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    return res.json(student);
});

// Tambah siswa baru
router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        name: 'string',
        birth_date: {type: 'date', convert: true},
        class_id: 'number',
        guardian_id: 'number'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const student = await Student.create(req.body);
    res.json(student);
});

// Update siswa
router.put('/:id', accessValidation, roleValidation(["admin", "wali_kelas"]), async (req, res) => {
    const id = req.params.id;
    
    let student = await Student.findByPk(id);
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    const schema = {
        name: 'string|optional',
        birth_date: 'date|optional',
        class_id: 'number|optional',
        guardian_id: 'number|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    student = await student.update(req.body);
    res.json(student);
});

// Hapus siswa
router.delete('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const student = await Student.findByPk(id);

    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    await student.destroy();
    res.json({ message: 'Student is deleted' });
});

module.exports = router;
