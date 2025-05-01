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
router.get('/student', async (req, res) => {
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
                        as: 'student',
                        attributes: ['id', 'name'],
                    }
                }
            ],
            order: [['date', 'DESC']] // Urutkan berdasarkan date dari yang terbaru
        });

        // Format response to include date, day (generated from date), and status
        const formattedAttendances = attendances.map(attendance => {
            const date = attendance.date;
            const day = new Date(date).toLocaleString('id-ID', { weekday: 'long' }); // Generate day from date
            return {
                date: date,
                day: day,
                status: attendance.status
            };
        });

        res.json(formattedAttendances);
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
                where: { semester_id: req.params.semesterId },
                attributes: ['id', 'title'], // Hanya mengambil id dan title
            }
        });

        const formattedEvaluations = evaluations.map(evaluation => {
            return {
                id: evaluation.evaluation.id,
                title: evaluation.evaluation.title,
            };
        });

        res.json(formattedEvaluations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Deskripsi evaluasi per semester
router.get('/evaluations/:semesterId/:evaluationId', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });

        const studentEvaluation = await StudentEvaluation.findOne({
            where: { 
                student_class_id: studentClass.id,
                evaluation_id: req.params.evaluationId 
            },
            include: {
                model: Evaluation,
                as: 'evaluation',
                where: { semester_id: req.params.semesterId },
                attributes: ['id', 'title'],
            }
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan untuk siswa pada semester ini.' });
        }

        const formattedEvaluation = {
            id: studentEvaluation.evaluation.id,
            title: studentEvaluation.evaluation.title,
            description: studentEvaluation.description // Deskripsi evaluasi siswa
        };

        res.json(formattedEvaluation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Daftar Mata Pelajaran Anak
router.get('/grades/:semesterId/subjects', async (req, res) => {
    try {
        const { semesterId } = req.params;

        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
        if (!studentClass) return res.status(404).json({ message: 'Student class not found' });

        // Sertakan relasi academic year
        const semester = await Semester.findByPk(semesterId, {
            include: {
                model: AcademicYear,
                as: 'academic_year',
                attributes: ['id', 'year', 'is_active']
            }
        });
        if (!semester) return res.status(404).json({ message: 'Semester not found' });

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

        const uniqueSubjectsMap = {};
        schedules.forEach(sch => {
            if (sch.subject && !uniqueSubjectsMap[sch.subject.id]) {
                uniqueSubjectsMap[sch.subject.id] = sch.subject;
            }
        });

        const uniqueSubjects = Object.values(uniqueSubjectsMap);

        // Gabungkan data semester dan subjects dalam satu response object
        res.json({
            semester_id: semester.id,
            semester_name: semester.name,
            academic_year_id: semester.academic_year?.id,
            academic_year_name: semester.academic_year?.year,
            is_academic_year_active: semester.academic_year?.is_active,
            subjects: uniqueSubjects
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// Daftar kategori mapel
router.get('/grades/:semesterId/:subjectId/categories', async (req, res) => {
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
            title: detail.name,
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