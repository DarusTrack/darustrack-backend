var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Subject, Curriculum } = require('../models');
const v = new Validator();
const roleValidation = require("../middleware/roleValidation");
const accessValidation = require('../middleware/accessValidation');

// Get semua mata pelajaran
router.get('/', accessValidation, async (req, res) => {
    const subjects = await Subject.findAll({
        include: [
            { model: Curriculum, as: 'curriculum', attributes: ['id', 'name'] }
        ]
    });
    return res.json(subjects);
});

// Get mata pelajaran berdasarkan ID
router.get('/:id', accessValidation, async (req, res) => {
    const id = req.params.id;
    const subject = await Subject.findByPk(id, {
        include: [
            { model: Curriculum, as: 'curriculum', attributes: ['id', 'name'] }
        ]
    });

    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    return res.json(subject);
});

// Tambah mata pelajaran baru
router.post('/',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        name: 'string',
        description: 'string|optional',
        curriculum_id: 'number'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const subject = await Subject.create(req.body);
    res.json(subject);
});

// Update mata pelajaran
router.put('/:id',  accessValidation, roleValidation(["admin"]),async (req, res) => {
    const id = req.params.id;

    let subject = await Subject.findByPk(id);
    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    const schema = {
        name: 'string|optional',
        description: 'string|optional',
        curriculum_id: 'number|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    subject = await subject.update(req.body);
    res.json(subject);
});

// Hapus mata pelajaran
router.delete('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const subject = await Subject.findByPk(id);

    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.destroy();
    res.json({ message: 'Subject is deleted' });
});

module.exports = router;
