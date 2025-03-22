var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Grade, Student, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const isWaliKelas = require('../middlewares/isWaliKelasValidation');
const roleValidation = require('../middlewares/roleValidation');
const v = new Validator();

// ✅ GET: Daftar mata pelajaran berdasarkan kelas tertentu
router.get("/", async (req, res) => {
    try {
        const { class_id } = req.query;

        if (!class_id) {
            return res.status(400).json({ message: "class_id is required" });
        }

        const students = await Student.findAll({
            where: { class_id },
            include: [
                {
                    model: Grade,
                    as: "grades",
                    include: [{ model: Subject, as: "subject", attributes: ["name"] }]
                }
            ]
        });

        return res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving grades", error });
    }
});

// ✅ GET: Daftar jenis penilaian dalam mata pelajaran
router.get("/:subject_id", async (req, res) => {
    try {
        const subject_id = req.params.subject_id;
        const grades = await Grade.findAll({
            where: { subject_id },
            attributes: ["type"],
            group: ["type"]
        });

        return res.json(grades);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving grade types", error });
    }
});

// ✅ GET: Daftar macam-macam penilaian (judul quiz, tugas, UTS, UAS)
router.get("/:subject_id/:type", async (req, res) => {
    try {
        const { subject_id, type } = req.params;
        const grades = await Grade.findAll({
            where: { subject_id, type },
            attributes: ["id", "description", "date"]
        });

        return res.json(grades);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving assessments", error });
    }
});

// ✅ GET: Daftar siswa dan skor berdasarkan judul penilaian
router.get("/:subject_id/:type/:grade_id", async (req, res) => {
    try {
        const { grade_id } = req.params;

        const grades = await Grade.findAll({
            where: { id: grade_id },
            include: [
                {
                    model: Student,
                    as: "student",
                    attributes: ["id", "name"]
                }
            ]
        });

        return res.json(grades);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving student scores", error });
    }
});

// ✅ POST: Buat judul penilaian baru dengan daftar siswa (skor null)
router.post("/:subject_id/:type", isWaliKelas, async (req, res) => {
    try {
        const { subject_id, type } = req.params;
        const { class_id, description, date } = req.body;

        const students = await Student.findAll({ where: { class_id } });

        if (!students.length) {
            return res.status(404).json({ message: "No students found in this class" });
        }

        const newGrades = students.map(student => ({
            student_id: student.id,
            subject_id,
            type,
            score: null,
            description,
            date
        }));

        const createdGrades = await Grade.bulkCreate(newGrades);

        return res.status(201).json(createdGrades);
    } catch (error) {
        res.status(500).json({ message: "Error creating assessment", error });
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
        date: { type: 'date', convert: true },
        description: 'string|optional'
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
