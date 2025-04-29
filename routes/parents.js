var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');
const Validator = require('fastest-validator');
const { User, Student, StudentClass, Attendance, Schedule, Subject, Class, Evaluation, AcademicCalendar, Curriculum, StudentEvaluation, GradeCategory, GradeDetail, StudentGrade } = require('../models');
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
            include: [{ 
                model: StudentClass,  
                as: "student_class", 
                attributes: ['id'],
                include: [{
                    model: Class,
                    as: 'class',
                    attributes: ['name'],
                    include: [{
                        model: User,
                        as: 'teacher',
                        attributes: ['name']
                    }] 
                }] 
            }]
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
router.get('/schedule', async (req, res) => {
    try {
        const parentId = req.user.id;

        // Cari siswa berdasarkan parent_id
        const student = await Student.findOne({
            where: { parent_id: parentId },
            include: [{
                model: StudentClass,
                as: 'student_class',
                attributes: ['class_id']
            }]
        });

        if (!student) {
            return res.status(404).json({ message: 'Data anak tidak ditemukan' });
        }

        // Ambil class_id dari relasi student_classes
        const classId = student.student_classes?.[0]?.class_id; // Ambil class_id pertama

        if (!classId) {
            return res.status(404).json({ message: 'Class ID tidak ditemukan untuk anak ini' });
        }

        const { day } = req.query;  // Ambil query parameter "day"
        const whereCondition = { class_id: classId };

        // Jika ada filter "day", tambahkan ke kondisi where
        if (day) {
            whereCondition.day = { [Op.eq]: day };  // Filter case-sensitive untuk MySQL
        }

        // Cari jadwal berdasarkan class_id yang ada di StudentClass
        const schedules = await Schedule.findAll({
            where: whereCondition,
            attributes: ['day', 'start_time', 'end_time'],
            include: [{ model: Subject, as: "subject", attributes: ['name'] }],
            order: [
                ['day', 'ASC'],
                ['start_time', 'ASC']
            ]
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
            attributes: ['date', 'status'],
            order: [['date', 'DESC']] // Urutkan dari tanggal terbaru
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

// Daftar Kategori Penilaian dalam Mata Pelajaran Tertentu
router.get('/grades/:subject_id', accessValidation, roleValidation(['orang_tua']), async (req, res) => {
    try {
        const { subject_id } = req.params;
        const parentId = req.user.id;

        // Cari data siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        // Cari semua GradeCategory yang sesuai dengan subject_id dan class_id anak
        const gradeCategories = await GradeCategory.findAll({
            where: { subject_id, class_id: student.class_id },
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!gradeCategories || gradeCategories.length === 0) {
            return res.status(404).json({ message: 'Tidak ada kategori penilaian untuk mata pelajaran ini' });
        }

        // Ambil daftar kategori penilaian
        const categories = gradeCategories.map(category => ({
            id: category.id,
            name: category.name
        }));

        res.json(categories);
    } catch (error) {
        console.error("Error fetching grade categories:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// detail category mapel (skor siswa)
router.get('/grades/category/:category_id/details', accessValidation, roleValidation(['orang_tua']), async (req, res) => {
    try {
        const { category_id } = req.params;
        const parentId = req.user.id;

        // Cari data siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        // Cari GradeCategory berdasarkan category_id dan pastikan sesuai dengan kelas anak
        const gradeCategory = await GradeCategory.findOne({
            where: { id: category_id, class_id: student.class_id },
            include: [
                {
                    model: GradeDetail,
                    as: 'grade_detail',
                    attributes: ['id', 'name', 'date'],
                    include: [
                        {
                            model: StudentGrade,
                            as: 'student_grades',
                            attributes: ['score'],
                            where: { student_id: student.id },
                            required: false // Jika tidak ada nilai, tetap tampilkan
                        }
                    ]
                }
            ]
        });

        if (!gradeCategory) return res.status(404).json({ message: 'Kategori penilaian tidak ditemukan atau tidak tersedia untuk anak Anda' });

        // Ambil daftar detail penilaian dalam kategori ini
        const grades = gradeCategory.grade_detail.map(detail => ({
            id: detail.id,
            title: detail.name,
            date: detail.date,
            day: new Date(detail.date).toLocaleDateString('id-ID', { weekday: 'long' }), // 🗓️ Menampilkan hari dalam bahasa Indonesia
            score: detail.student_grades.length > 0 ? detail.student_grades[0].score : null // 📝 Menampilkan skor jika ada
        }));

        res.json(grades);
    } catch (error) {
        console.error("Error fetching category details:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;