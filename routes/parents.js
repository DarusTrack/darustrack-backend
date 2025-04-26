var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');
const Validator = require('fastest-validator');
const { User, Student, Attendance, Schedule, Subject, Class, StudentClass, Evaluation, AcademicCalendar, AcademicYear, Semester, Curriculum, StudentEvaluation, GradeCategory, GradeDetail, StudentGrade } = require('../models');
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
                model: Class,  
                as: "class", 
                attributes: ['name'],
                include: [{
                    model: User,
                    as: 'teacher',
                    attributes: ['name']
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

// kehadiran
router.get('/attendance', accessValidation, async (req, res) => {
    try {
        const parentId = req.user.id;

        // Cari siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Ambil tahun ajaran aktif
        const academicYear = await AcademicYear.findOne({
            where: { is_active: true },
            include: [Semester],
        });

        if (!academicYear) {
            return res.status(404).json({ message: "Active academic year not found" });
        }

        // Ambil semua semester yang terkait dengan tahun ajaran aktif
        const semesters = academicYear.Semesters;
        if (!semesters.length) {
            return res.status(404).json({ message: "No semesters found for the active academic year" });
        }

        // Jika semester ditemukan, tampilkan daftar semester terlebih dahulu
        if (!req.query.semesterId) {
            return res.json({
                message: 'Select a semester',
                semesters: semesters.map(semester => ({
                    id: semester.id,
                    name: semester.name,
                    start_date: semester.start_date,
                    end_date: semester.end_date,
                }))
            });
        }

        const semesterId = req.query.semesterId;

        // Ambil kehadiran siswa berdasarkan semester yang dipilih
        const attendances = await Attendance.findAll({
            where: {
                student_id: student.id,
                semester_id: semesterId, // Pastikan kehadiran berdasarkan semester yang dipilih
            },
            attributes: ['date', 'status'],
            order: [['date', 'DESC']], // Urutkan berdasarkan tanggal terbaru
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

        // Kembalikan data kehadiran setelah semester dipilih
        res.json(formattedAttendances);
        
    } catch (error) {
        console.error("Attendance Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// detail kehadiran
router.get('/attendance/detail', accessValidation, async (req, res) => {
    try {
        const parentId = req.user.id;

        // Cari siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Cari kelas siswa yang terkait dengan semester tertentu
        const studentClasses = await StudentClass.findAll({
            where: { student_id: student.id },
            include: [{
                model: Class,
                where: { semester_id: req.query.semesterId }, // Menyesuaikan semester
                attributes: ['id'], // Hanya ambil id kelas
            }],
        });

        if (!studentClasses.length) {
            return res.status(404).json({ message: "No student classes found for this semester" });
        }

        // Ambil student_class_id dari hasil query
        const studentClassIds = studentClasses.map(sc => sc.id);

        // Cari kehadiran berdasarkan student_class_id dan semester
        const attendances = await Attendance.findAll({
            where: {
                student_class_id: studentClassIds,
            },
            attributes: ['date', 'status'],
            order: [['date', 'DESC']],
        });

        if (!attendances.length) {
            return res.status(404).json({ message: "No attendance records found for this semester" });
        }

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

        res.json({
            semester_id: req.query.semesterId,
            attendances: formattedAttendances,
        });

    } catch (error) {
        console.error("Attendance Detail Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Ambil daftar title evaluasi berdasarkan siswa yang dimiliki oleh orang tua yang login
router.get('/evaluations', async (req, res) => {
    try {
        const parentId = req.user.id;

        // Ambil siswa yang dimiliki oleh orang tua
        const students = await Student.findAll({
            where: { parent_id: parentId },
            attributes: ['id'] // Ambil hanya ID siswa
        });

        if (!students.length) return res.status(404).json({ message: 'No students found for this parent' });

        const studentIds = students.map(student => student.id);

        // Ambil kelas siswa melalui relasi student_classes
        const studentClasses = await StudentClass.findAll({
            where: { student_id: { [Op.in]: studentIds } },
            attributes: ['student_id', 'class_id']
        });

        if (!studentClasses.length) return res.status(404).json({ message: 'No classes found for these students' });

        const classIds = studentClasses.map(studentClass => studentClass.class_id);

        // Cari semester aktif
        const activeSemester = await Semester.findOne({
            where: { is_active: true }
        });

        if (!activeSemester) return res.status(404).json({ message: 'No active semester found' });

        // Menggunakan relasi yang benar
        const evaluations = await Evaluation.findAll({
            where: {
                student_class_id: { [Op.in]: classIds } // Filter berdasarkan class_ids yang sudah diproses sebelumnya
            },
            include: [
                {
                    model: StudentClass,
                    as: 'student_class', // Gunakan relasi yang tepat dari model Evaluation ke StudentClass
                    include: [
                        {
                            model: Class,
                            as: 'class', // Relasi Class melalui StudentClass
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ],
            attributes: ['id', 'title'],
            group: ['title']
        });        

        if (!evaluations.length) return res.status(404).json({ message: 'No evaluations found for your children' });

        res.json(evaluations);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Ambil daftar evaluasi berdasarkan title yang dipilih dan semester aktif
router.get('/evaluations/:title', async (req, res) => {
    try {
        const parentId = req.user.id;
        const evaluationTitle = req.params.title;

        // Ambil siswa yang dimiliki oleh orang tua
        const students = await Student.findAll({
            where: { parent_id: parentId },
            attributes: ['id', 'student_class_id'] // Mengambil student_class_id dari model Student
        });

        if (!students.length) return res.status(404).json({ message: 'No students found for this parent' });

        const studentClassIds = students.map(student => student.student_class_id); // Mengambil student_class_id dari siswa

        // Cari semester aktif
        const activeSemester = await Semester.findOne({
            where: { is_active: true }
        });

        if (!activeSemester) return res.status(404).json({ message: 'No active semester found' });

        // Ambil evaluasi berdasarkan title, student_class_id, dan semester aktif
        const evaluations = await Evaluation.findAll({
            where: {
                student_class_id: { [Op.in]: studentClassIds },
                title: evaluationTitle,
                semester_id: activeSemester.id
            },
            attributes: ['id', 'title', 'student_class_id', 'description'],
            include: [
                {
                    model: StudentClass,
                    as: 'student_class',
                    include: [
                        {
                            model: Class,
                            as: 'class', // Menggunakan 'class' di sini untuk mengakses model Class
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: StudentEvaluation,
                    as: 'student_evaluation',
                    attributes: ['id', 'description'], // Menampilkan deskripsi evaluasi
                    include: [
                        {
                            model: Student,
                            as: 'student',
                            attributes: ['id', 'name']  // Menampilkan data siswa yang terkait
                        }
                    ]
                }
            ]
        });
        
        if (!evaluations.length) return res.status(404).json({ message: `No evaluations found for title: ${evaluationTitle}` });

        res.json(evaluations);
    } catch (error) {
        console.error(error); // Log the error for debugging
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

        // Ambil mata pelajaran yang terkait dengan kelas anak berdasarkan jadwal
        const subjects = await Subject.findAll({
            include: [{
                model: Schedule,
                as: "schedule",
                where: { class_id: student.class_id },
                attributes: ['id', 'subject_id']  // Ambil id jadwal dan subject_id
            }],
            attributes: ['id', 'name']  // Hanya ambil id dan nama mata pelajaran
        });

        if (subjects.length === 0) {
            return res.status(404).json({ message: 'Tidak ada mata pelajaran untuk kelas anak ini' });
        }

        res.json(subjects);  // Kirimkan daftar mata pelajaran
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

        // Cari kategori penilaian berdasarkan mata pelajaran dan kelas anak
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

        res.json(categories);  // Kirimkan kategori penilaian
    } catch (error) {
        console.error("Error fetching grade categories:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Daftar Semester pada Tahun Ajaran Aktif untuk Kategori Tertentu
router.get('/grades/:subject_id/categories/:category_id/semesters', async (req, res) => {
    try {
        const { subject_id, category_id } = req.params;
        const parentId = req.user.id;

        // Cari data siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        // Cari tahun ajaran aktif
        const activeSemester = await Semester.findOne({
            where: { is_active: true },
            order: [['start_date', 'ASC']]  // Ambil tahun ajaran aktif dengan urutan berdasarkan start date
        });

        if (!activeSemester) {
            return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        // Ambil daftar semester berdasarkan kategori dan tahun ajaran aktif
        const gradeCategory = await GradeCategory.findOne({
            where: { id: category_id, subject_id, class_id: student.class_id },
        });

        if (!gradeCategory) {
            return res.status(404).json({ message: 'Kategori penilaian tidak ditemukan untuk mata pelajaran ini' });
        }

        // Ambil semester terkait dengan kategori dan tahun ajaran aktif
        const semesters = await Semester.findAll({
            where: { academic_year_id: activeSemester.academic_year_id },
            attributes: ['id', 'name', 'start_date', 'end_date']
        });

        res.json(semesters);  // Kirimkan daftar semester
    } catch (error) {
        console.error("Error fetching semesters:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Detail Kategori di Semester Tertentu
router.get('/grades/:subject_id/categories/:category_id/semesters/:semester_id', async (req, res) => {
    try {
        const { subject_id, category_id, semester_id } = req.params;
        const parentId = req.user.id;

        // Cari data siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: parentId } });

        if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

        // Cari semester yang dipilih
        const semester = await Semester.findByPk(semester_id);

        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        // Cari kategori penilaian pada semester tersebut
        const categoryDetail = await GradeCategory.findOne({
            where: { id: category_id, subject_id, class_id: student.class_id }
        });

        if (!categoryDetail) {
            return res.status(404).json({ message: 'Kategori penilaian tidak ditemukan' });
        }

        // Ambil detail penilaian untuk kategori pada semester ini (misalnya nilai dan deskripsi)
        const categoryDetails = {
            id: categoryDetail.id,
            name: categoryDetail.name,
            semester: semester.name,
            start_date: semester.start_date,
            end_date: semester.end_date,
        };

        res.json(categoryDetails);  // Kirimkan detail kategori
    } catch (error) {
        console.error("Error fetching category details:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;