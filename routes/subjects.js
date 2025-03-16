var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Subject } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');

// ✅ GET: Daftar mata pelajaran berdasarkan kelas tertentu
router.get("/", async (req, res) => {
    try {
        const subjects = await Subject.findAll({
            attributes: ['id', 'name'] // ✅ Hanya menampilkan nama siswa
        });
        return res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error });
    }
});

// ✅ GET: Detail mata pelajaran + capaian pembelajaran
router.get("/:id", async (req, res) => {
    try {
        const subject = await Subject.findByPk(req.params.id);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        return res.json(subject);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subject", error });
    }
});
  
// Tambah mata pelajaran baru
router.post('/',  accessValidation, roleValidation(["admin", "orang_tua"]), async (req, res) => {
    const schema = {
        name: 'string',
        learning_goals: 'string'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const subject = await Subject.create(req.body);
    res.json(subject);
});

// Update mata pelajaran
router.put('/:id',  accessValidation, roleValidation(["admin", "orang_tua"]),async (req, res) => {
    const id = req.params.id;

    let subject = await Subject.findByPk(id);
    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    const schema = {
        name: 'string|optional',
        learning_goals: 'string|optional'
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
