var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Student, Attendance, Schedule, Subject, Class, Evaluation, AcademicCalendar, Curriculum } = require('../models');
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
            attributes: ['name', 'start_date', 'end_date']
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🔹 Capaian Mata Pelajaran
router.get('/achievements', async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        const achievements = await Achievement.findAll({
            include: [{
                model: Subject,
                as: "subject",
                attributes: ['name'],
                where: { class_id: student.class_id }
            }]
        });

        res.json(achievements);
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

// 🔹 Evaluasi Anak
router.get('/evaluations', async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        const evaluations = await Evaluation.findAll({
            where: { student_id: student.id },
            attributes: ['title', 'description']
        });

        res.json(evaluations);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;