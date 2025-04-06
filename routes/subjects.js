var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Subject, LearningOutcome } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

// ✅ GET: Daftar mata pelajaran
router.get("/", async (req, res) => {
    try {
        const subjects = await Subject.findAll(
            { 
                attributes: ['id','name'],
                order: [['name', 'ASC']]
            });
        return res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error });
    }
});
  
// Tambah mata pelajaran baru
router.post('/', async (req, res) => {
    const schema = {
        name: 'string',
        description: 'text'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const subject = await Subject.create(req.body);
    res.json(subject);
});

// Update mata pelajaran
router.put('/:id', async (req, res) => {
    const id = req.params.id;

    let subject = await Subject.findByPk(id);
    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    const schema = {
        name: 'string|optional',
        description: 'string|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    subject = await subject.update(req.body);
    res.json(subject);
});

// Hapus mata pelajaran
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    const subject = await Subject.findByPk(id);

    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.destroy();
    res.json({ message: 'Subject is deleted' });
});


// Get capaian pembelajaran berdasarkan mata pelajaran
router.get('/:id', accessValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const subject = await Subject.findOne({
            where: { id },
            attributes: ['id', 'name', 'description']
        });

        if (!subject) {
            return res.status(404).json({ message: 'Subject tidak ditemukan' });
        }

        res.json(subject);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil detail mata pelajaran', error: error.message });
    }
});

module.exports = router;
