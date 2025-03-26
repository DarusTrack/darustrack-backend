var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Student, Attendance, Schedule, Subject, Class, Evaluation, AcademicCalendar, Curriculum, StudentEvaluation } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

router.use(accessValidation, roleValidation(['orang_tua']));

// 🔹 Profile Anak
router.get('/profile', async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({
            where: { parent_id: parentId },
            attributes: ['name', 'nisn', 'birth_date'],
            include: [{ model: Class,  as: "class", attributes: ['name'] }]
        });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        res.json(student);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Data Kurikulum
router.get('/curriculum', async (req, res) => {
    try {
        const curriculum = await Curriculum.findOne({
            attributes: ['name', 'description']
        });
        res.json(curriculum);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Jadwal Mata Pelajaran Anak berdasarkan Hari
router.get('/schedule', async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        const schedules = await Schedule.findAll({
            where: { class_id: student.class_id },
            attributes: ['day', 'start_time', 'end_time'],
            include: [{ model: Subject,  as: "subject", attributes: ['name'] }]
        });

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Kalender Akademik
router.get('/academic-calendar', async (req, res) => {
    try {
        const events = await AcademicCalendar.findAll({
            attributes: ['event_name', 'start_date', 'end_date']
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Penilaian Akademik
router.get('/assessments/:subject_id/:type', async (req, res) => {
    try {
        const { subject_id, type } = req.params;
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        const assessments = await Assessment.findAll({
            where: { student_id: student.id, subject_id, type },
            attributes: ['date', 'title', 'score']
        });

        res.json(assessments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Kehadiran Anak
router.get('/attendance', async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        const attendances = await Attendance.findAll({
            where: { student_id: student.id },
            attributes: ['date', 'status']
        });

        res.json(attendances);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Ambil daftar evaluasi yang ditambahkan oleh wali kelas untuk anak dari orang tua yang login
router.get('/evaluations', async (req, res) => {
    try {
        const parentId = req.user.id;

        // Ambil siswa berdasarkan parentId
        const students = await Student.findAll({
            where: { parent_id: parentId },
            attributes: ['id', 'class_id']
        });

        if (!students.length) {
            return res.status(404).json({ message: 'No students found for this parent' });
        }

        const classIds = students.map(student => student.class_id);

        // Cari evaluasi berdasarkan class_id yang diajar oleh wali kelas
        const evaluations = await Evaluation.findAll({
            where: { class_id: classIds },
            attributes: ['id', 'title']
        });

        res.json(evaluations);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// 🔹 Ambil hanya description dari evaluasi berdasarkan ID untuk anak tertentu
router.get('/evaluations/:id', async (req, res) => {
    try {
        const parentId = req.user.id;
        const evaluationId = req.params.id;

        // Ambil siswa berdasarkan parentId
        const students = await Student.findAll({
            where: { parent_id: parentId },
            attributes: ['id']
        });

        if (!students.length) {
            return res.status(404).json({ message: 'No students found for this parent' });
        }

        const studentIds = students.map(student => student.id);

        // Cari evaluasi dengan hanya menampilkan atribut description
        const studentEvaluation = await StudentEvaluation.findOne({
            where: { evaluation_id: evaluationId, student_id: studentIds },
            attributes: ['description']
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluation not found or not assigned to your child' });
        }

        res.json({ description: studentEvaluation.description });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;