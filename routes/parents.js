var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');
const Validator = require('fastest-validator');
const { Student, Attendance, Schedule, Subject, Class, Evaluation, AcademicCalendar, Curriculum, StudentEvaluation, Assessment, AssessmentType, Grade, StudentScore } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

router.use(accessValidation, roleValidation(['orang_tua']));

// Profile Anak
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

// Data Kurikulum
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

// Jadwal Mata Pelajaran Anak berdasarkan Hari
router.get('/schedule', accessValidation, async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) {
            return res.status(404).json({ message: 'Data anak tidak ditemukan' });
        }

        const { day } = req.query;  // Ambil query parameter "day"
        const whereCondition = { class_id: student.class_id };

        // Jika ada filter "day", tambahkan ke kondisi where
        if (day) {
            whereCondition.day = { [Op.eq]: day };  // Filter case-sensitive untuk MySQL
        }

        const schedules = await Schedule.findAll({
            where: whereCondition,
            attributes: ['day', 'start_time', 'end_time'],
            include: [{ model: Subject, as: "subject", attributes: ['name'] }]
        });

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Kalender Akademik
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

// Kehadiran Anak
router.get('/attendance', accessValidation, async (req, res) => {
    try {
        const parentId = req.user.id;
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Ambil parameter date dari query (format: YYYY-MM-DD)
        const { date } = req.query;

        // Buat kondisi where untuk filter tanggal jika ada
        const whereCondition = { student_id: student.id };
        if (date) {
            whereCondition.date = { [Op.eq]: date };
        }

        const attendances = await Attendance.findAll({
            where: whereCondition,
            attributes: ['date', 'status']
        });

        // Format response untuk menambahkan nama hari
        const formattedAttendances = attendances.map(attendance => {
            const dateObj = new Date(attendance.date);
            const daysOfWeek = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const day = daysOfWeek[dateObj.getUTCDay()];

            return {
                date: attendance.date,
                day: day,
                status: attendance.status
            };
        });

        res.json(formattedAttendances);
    } catch (error) {
        console.error("Attendance Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Ambil daftar evaluasi yang ditambahkan oleh wali kelas untuk anak dari orang tua yang login
router.get('/evaluations', async (req, res) => {
    try {
        const parentId = req.user.id;

        const students = await Student.findAll({
            where: { parent_id: parentId },
            attributes: ['id', 'class_id']
        });

        if (!students.length) return res.status(404).json({ message: 'No students found for this parent' });

        const classIds = students.map(student => student.class_id);

        const evaluations = await Evaluation.findAll({
            where: { class_id: { [Op.in]: classIds } },  // Filter hanya evaluasi yang relevan
            attributes: ['id', 'title']
        });

        res.json(evaluations);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Ambil hanya description dari evaluasi berdasarkan ID untuk anak tertentu
router.get('/evaluations/:id', async (req, res) => {
    try {
        const parentId = req.user.id;
        const evaluationId = req.params.id;

        const students = await Student.findAll({
            where: { parent_id: parentId },
            attributes: ['id']
        });

        if (!students.length) return res.status(404).json({ message: 'No students found for this parent' });

        const studentIds = students.map(student => student.id);

        const studentEvaluation = await StudentEvaluation.findOne({
            where: { evaluation_id: evaluationId, student_id: { [Op.in]: studentIds } },  // Evaluasi hanya untuk anaknya
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

// Daftar Mata Pelajaran Anak
router.get('/grades', async (req, res) => {
    try {
        const parentId = req.user.id;

        // Cari data anak berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        // Ambil mata pelajaran yang telah dimasukkan oleh wali kelas
        const subjects = await Subject.findAll({
            include: [{
                model: Schedule,
                as: "schedule",
                where: { class_id: student.class_id },
                attributes: []
            }],
            attributes: ['id', 'name']
        });

        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Daftar Penilaian dalam Mata Pelajaran Tertentu
router.get('/grades/:subject_id', accessValidation, roleValidation(['orang_tua']), async (req, res) => {
    try {
        const { subject_id } = req.params;
        const parentId = req.user.id;

        // 🔍 Cari data siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        // 🔍 Cari Grade yang sesuai dengan subject_id dan kelas siswa
        const grade = await Grade.findOne({
            where: { subject_id, class_id: student.class_id },
            include: [
                {
                    model: Assessment,
                    as: 'assessment',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!grade) return res.status(404).json({ message: 'Tidak ada penilaian untuk mata pelajaran ini' });

        // 🔍 Ambil daftar assessment berdasarkan Grade
        const assessments = grade.assessment.map(assessment => ({
            id: assessment.id,
            name: assessment.name
        }));

        res.json(assessments);
    } catch (error) {
        console.error("Error fetching assessments:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
})

// Skor siswa
router.get('/grades/:subjectId/assessments/:assessmentId', accessValidation, roleValidation(['orang_tua']), async (req, res) => {
    try {
        const { subjectId, assessmentId } = req.params;
        const parentId = req.user.id;

        // ✅ CARI SISWA BERDASARKAN ID ORANG TUA
        const student = await Student.findOne({ where: { parent_id: parentId } });
        if (!student) return res.status(404).json({ message: "Siswa tidak ditemukan" });

        console.log(" Siswa ditemukan:", student.id);

        // ✅ CARI ASSESSMENT TYPES BERDASARKAN assessmentId
        const assessmentTypes = await AssessmentType.findAll({
            include: [
                {
                    model: Assessment,
                    as: 'assessment',
                    where: { id: assessmentId },
                    attributes: ['id', 'name']
                }
            ],
            attributes: ['id', 'name', 'date']
        });

        if (!assessmentTypes.length) {
            return res.status(404).json({ message: "Jenis penilaian tidak ditemukan" });
        }

        // ✅ CARI NILAI SISWA BERDASARKAN assessment_type_id
        const studentScores = await StudentScore.findAll({
            where: { student_id: student.id },
            attributes: ['score', 'assessment_type_id']
        });

        // ✅ Gabungkan data AssessmentType dengan Nilai Siswa
        const response = assessmentTypes.map(assessmentType => {
            const studentScore = studentScores.find(score => score.assessment_type_id === assessmentType.id);

            return {
                id: assessmentType.id,
                name: assessmentType.name,
                date: assessmentType.date,
                assessment_name: assessmentType.assessment?.name,
                score: studentScore ? studentScore.score : "Null"
            };
        });

        console.log(" Data untuk Orang Tua:", response);
        // return res.json({ assessment_id: assessmentId, types: response });
        return res.json(response);

    } catch (error) {
        console.error(" Error fetching assessment details:", error);
        return res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});


module.exports = router;