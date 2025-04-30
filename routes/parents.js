var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');
const Validator = require('fastest-validator');
const { User, AcademicYear, Semester, Student, StudentClass, Attendance, Schedule, Subject, Class, Evaluation, AcademicCalendar, Curriculum, StudentEvaluation, GradeCategory, GradeDetail, StudentGrade } = require('../models');
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
        console.log(`Parent ID: ${parentId}`);

        // Cari siswa berdasarkan parent_id
        const student = await Student.findOne({
            where: { parent_id: parentId },
            include: [{
                model: StudentClass,
                as: 'student_class',
                attributes: ['class_id'],
                include: [{
                    model: Class,
                    as: 'class',
                    attributes: ['id', 'academic_year_id'],
                    include: [{
                        model: AcademicYear,
                        as: 'academic_year',
                        where: { is_active: true },
                        attributes: ['id']
                    }]
                }]
            }]
        });

        if (!student) {
            return res.status(404).json({ message: 'Data anak tidak ditemukan' });
        }

        console.log('Student Data:', student);

        // Ambil data student_class (pastikan alias sama dengan include)
        const studentClass = student.student_class?.[0]; // <- PERBAIKAN: student_class, bukan student_classes
        console.log('Student Class:', studentClass);

        const classId = studentClass?.class_id;
        const academicYearId = studentClass?.class?.academic_year_id;

        if (!classId || !academicYearId) {
            return res.status(404).json({ message: 'Class ID atau tahun ajaran tidak ditemukan' });
        }

        // Ambil parameter "day" dari query
        const { day } = req.query;
        const whereCondition = { class_id: classId };

        if (day) {
            whereCondition.day = { [Op.eq]: day };
        }

        // Cari jadwal sesuai class_id
        const schedules = await Schedule.findAll({
            where: whereCondition,
            attributes: ['day', 'start_time', 'end_time'],
            include: [{
                model: Subject,
                as: 'subject',
                attributes: ['name']
            }],
            order: [
                ['day', 'ASC'],
                ['start_time', 'ASC']
            ]
        });

        res.json(schedules);
    } catch (error) {
        console.error('Server Error:', error.message);
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

// Daftar semester tahun ajaran aktif (kehadiran dan evaluasi)
router.get('/semesters', async (req, res) => {
    try {
        const semesters = await Semester.findAll({
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true }
            }
        });
        res.json(semesters);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
  
// Kehadiran anak per semester
router.get('/attendances/:semesterId', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });

        const attendances = await Attendance.findAll({
            where: {
                student_class_id: studentClass.id,
                semester_id: req.params.semesterId
            },
            include: [
                {
                    model: StudentClass,
                    as: 'student_class',
                    include: {
                        model: Student,
                        attributes: ['id', 'name'],
                    }
                }
            ]
        });        

        res.json(attendances);
    } catch (error) {
        console.error(error); // untuk debugging
        res.status(500).json({ message: error.message });
    }    
});

// Daftar title evaluasi per semester
router.get('/evaluations/:semesterId', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });

        const evaluations = await StudentEvaluation.findAll({
            where: { student_class_id: studentClass.id },
            include: {
                model: Evaluation,
                as: 'evaluation',
                where: { semester_id: req.params.semesterId }
            }
        });

        res.json(evaluations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Deskripsi evaluasi per semester
router.get('/evaluations/detail/:studentEvaluationId', async (req, res) => {
    try {
        const evaluationDetail = await StudentEvaluation.findOne({
            where: {
                id: req.params.studentEvaluationId
            },
            include: {
                model: Evaluation,
                as: 'evaluation'
            }
        });

        res.json(evaluationDetail);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Daftar Mata Pelajaran Anak
router.get('/grades/subjects', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
        if (!studentClass) return res.status(404).json({ message: 'Student class not found' });

        const schedules = await Schedule.findAll({
            where: {
                class_id: studentClass.class_id
            },
            include: {
                model: Subject,
                as: 'subject',
                attributes: ['id', 'name']
            }
        });

        // Hilangkan duplikat subject
        const uniqueSubjectsMap = {};
        schedules.forEach(sch => {
            if (!uniqueSubjectsMap[sch.subject.id]) {
                uniqueSubjectsMap[sch.subject.id] = sch.subject;
            }
        });

        const uniqueSubjects = Object.values(uniqueSubjectsMap);

        res.json(uniqueSubjects);
    } catch (error) {
        console.error(error); // log detail untuk debugging
        res.status(500).json({ message: error.message });
    }
});

// Daftar kategori mapel
router.get('/grades/subjects/:subjectId/semesters/:semesterId/categories', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });

        const gradeCategories = await GradeCategory.findAll({
            where: {
                subject_id: req.params.subjectId,
                semester_id: req.params.semesterId,
                class_id: studentClass.class_id
            }
        });

        res.json(gradeCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Detail Kategori (nilai dari jenis kategori)
router.get('/grades/categories/:gradeCategoryId/details', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });

        const gradeDetails = await GradeDetail.findAll({
            where: { grade_category_id: req.params.gradeCategoryId },
            include: {
                model: StudentGrade,
                as: 'student_grade',
                where: { student_class_id: studentClass.id },
                required: false
            }
        });

        const result = gradeDetails.map(detail => ({
            name: detail.name,
            date: detail.date,
            day: new Date(detail.date).toLocaleString('id-ID', { weekday: 'long' }),
            score: detail.student_grade.length > 0 ? detail.student_grade[0].score : null
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;