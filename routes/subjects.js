var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Subject, LearningOutcome } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

// ✅ GET: Daftar mata pelajaran
router.get("/", accessValidation, async (req, res) => {
    try {
        const subjects = await Subject.findAll({attributes: ['id','name']});
        return res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error });
    }
});

// // ✅ GET: Detail mata pelajaran + capaian pembelajaran
// router.get("/:id", accessValidation, async (req, res) => {
//     try {
//         const subject = await Subject.findByPk(req.params.id);
//         if (!subject) {
//             return res.status(404).json({ message: "Subject not found" });
//         }
//         return res.json(subject);
//     } catch (error) {
//         res.status(500).json({ message: "Error retrieving subject", error });
//     }
// });
  
// Tambah mata pelajaran baru
router.post('/',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        name: 'string'
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
        name: 'string|optional'
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


// Get capaian pembelajaran berdasarkan mata pelajaran (kelas 1-6) dengan filter grade_level
router.get('/:subject_id/learning-outcomes', accessValidation, async (req, res) => {
    try {
        const { grade_level } = req.query;
        const { subject_id } = req.params;

        let whereCondition = { subject_id };
        if (grade_level) {
            whereCondition.grade_level = grade_level;
        }

        // Pastikan menggunakan relasi yang benar
        const outcomes = await LearningOutcome.findAll({
            where: whereCondition,
            order: [['grade_level', 'ASC']],
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['name']
                }
            ]
        });

        res.json(outcomes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching learning outcomes', error: error.message });
    }
});

// Tambah capaian pembelajaran berdasarkan mata pelajaran (kelas 1-6)
router.post('/:subject_id/learning-outcomes', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
        const { grade_level, description } = req.body;
        const { subject_id } = req.params;

        // Validasi input tidak boleh kosong
        if (!grade_level || !description) {
            return res.status(400).json({ message: 'Grade level dan description wajib diisi' });
        }

        // Cek apakah sudah ada capaian pembelajaran dengan grade_level yang sama di subject_id yang sama
        const existingOutcome = await LearningOutcome.findOne({
            where: { subject_id, grade_level }
        });

        if (existingOutcome) {
            return res.status(400).json({ message: `Capaian pembelajaran untuk grade ${grade_level} pada mata pelajaran ini sudah ada` });
        }

        // Buat capaian pembelajaran baru jika tidak ada duplikasi
        const newOutcome = await LearningOutcome.create({
            subject_id,
            grade_level,
            description
        });

        res.status(201).json({ message: 'Capaian pembelajaran berhasil ditambahkan', data: newOutcome });
    } catch (error) {
        res.status(500).json({ message: 'Error adding learning outcome', error: error.message });
    }
});

// Update capaian pembelajaran berdasarkan subject_id dan learning_outcome_id
router.put('/:subject_id/learning-outcomes/:learning_outcome_id', accessValidation, roleValidation(['admin']),async (req, res) => {
    try {
        const { subject_id, learning_outcome_id } = req.params;
        const { grade_level, description } = req.body;

        // Update capaian pembelajaran berdasarkan subject_id & learning_outcome_id
        const [updated] = await LearningOutcome.update(
            { grade_level, description },
            {
                where: { id: learning_outcome_id, subject_id: subject_id }
            }
        );

        // Jika tidak ada data yang diperbarui
        if (updated === 0) {
            return res.status(404).json({ message: 'Capaian pembelajaran tidak ditemukan atau tidak sesuai dengan subject_id' });
        }

        // Ambil data yang sudah diperbarui
        const updatedOutcome = await LearningOutcome.findOne({
            where: { id: learning_outcome_id, subject_id: subject_id }
        });

        res.json({ message: 'Capaian pembelajaran berhasil diperbarui', data: updatedOutcome });
    } catch (error) {
        res.status(500).json({ message: 'Error updating learning outcome', error });
    }
});

module.exports = router;
