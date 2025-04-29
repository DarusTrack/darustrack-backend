const express = require('express');
const router = express.Router();
const { Class, StudentGrade, GradeCategory, GradeDetail, Attendance, Subject, AcademicYear, Semester, StudentClass } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Endpoint: Get all classes summary
router.get('/classes', accessValidation, roleValidation(["kepala_sekolah"]), async (req, res) => {
    try {
        // Mendapatkan tahun ajaran aktif
        const academicYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!academicYear) {
            return res.status(404).json({ message: 'No active academic year found.' });
        }

        // Mendapatkan semester aktif
        const semester = await Semester.findOne({
            where: {
                academic_year_id: academicYear.id,
                is_active: true
            }
        });
        if (!semester) {
            return res.status(404).json({ message: 'No active semester found.' });
        }

        // Mendapatkan kelas yang terkait dengan tahun ajaran aktif
        const classes = await Class.findAll({
            where: {
                academic_year_id: academicYear.id
            },
            include: [
                { 
                    model: StudentClass, 
                    as: 'student_classes',
                    include: [
                        {
                            model: Attendance,
                            as: 'attendances',  // Mengambil data kehadiran setiap kelas siswa
                            where: { semester_id: semester.id },
                            attributes: ['status'] 
                        },
                        { 
                            model: GradeCategory,
                            as: 'GradeCategories',
                            include: [
                                { 
                                    model: StudentGrade, 
                                    as: 'student_grades',
                                    attributes: ['score'],
                                    where: { student_class_id: sequelize.col('student_classes.id') }  // Gabungkan dengan student_class_id
                                }
                            ]
                        }
                    ]
                }
            ]
        });        
        
        // Format data untuk kelas
        const formattedClasses = classes.map(classItem => {
            const grade_level = classItem.name.split(' ')[0];  // Contoh: "1A" -> "1"

            // Hitung total siswa
            const total_students = classItem.student_classes.length;

            // Hitung rata-rata nilai
            const totalScore = classItem.student_classes.reduce((acc, studentClass) => {
                const scores = studentClass.GradeCategories.flatMap(gradeCategory => 
                    gradeCategory.student_grades.map(grade => grade.score)
                );
                return acc + scores.reduce((sum, score) => sum + score, 0);
            }, 0);
            const average_score = (totalScore / (total_students * classItem.student_classes[0].GradeCategories.length)) || 0;

            // Hitung persentase kehadiran
            const totalAttendance = classItem.student_classes.reduce((acc, studentClass) => {
                return acc + studentClass.attendances.length;
            }, 0);
            const presentAttendance = classItem.student_classes.reduce((acc, studentClass) => {
                return acc + studentClass.attendances.filter(att => att.status === 'Hadir').length;
            }, 0);
            const attendance_percentage = (totalAttendance === 0) ? '0%' : `${(presentAttendance / totalAttendance) * 100}%`;

            // Kembalikan data yang sudah diformat
            return {
                id: classItem.id,
                name: classItem.name,
                grade_level,  // Level kelas yang diekstrak dari nama kelas
                total_students,
                average_score: average_score.toFixed(2), // Bulatkan ke 2 angka desimal
                attendance_percentage
            };
        });

        // Kirim data dalam bentuk JSON
        return res.json(formattedClasses);
    } catch (error) {
        console.error(error); // Log error untuk debugging
        return res.status(500).json({ message: 'Internal Server Error', error });
    }
});

// Endpoint: Get detail class
router.get('/classes/:classId', async (req, res) => {
    try {
        const { classId } = req.params;

        const classData = await Class.findByPk(classId, {
            include: [
                { model: StudentClass, as: 'student_classes', include: [{ model: Attendance, as: 'attendance' }] },
                { model: GradeCategory, as: 'grade_category', include: [{ model: StudentGrade, as: 'student_grades' }] }
            ]
        });

        if (!classData) {
            return res.status(404).json({ message: 'Class not found.' });
        }

        const totalStudents = classData.student_classes.length;
        const subjectAverages = [];

        for (let gradeCategory of classData.grade_category) {
            const subjectId = gradeCategory.subject_id;
            const grades = await StudentGrade.findAll({
                where: { grade_category_id: gradeCategory.id },
            });
            const averageScore = grades.reduce((acc, grade) => acc + grade.score, 0) / grades.length;

            subjectAverages.push({
                subject_id: subjectId,
                subject_name: gradeCategory.subject.name,
                average_score: averageScore
            });
        }

        const classAverage = subjectAverages.reduce((acc, subject) => acc + subject.average_score, 0) / subjectAverages.length;

        const attendancePercentage = (classData.student_classes.reduce((acc, studentClass) => {
            const totalAttendance = studentClass.attendance.length;
            const attended = studentClass.attendance.filter(a => a.status === 'Hadir').length;
            return acc + (attended / totalAttendance);
        }, 0)) / totalStudents;

        const studentRanks = classData.student_classes.map((studentClass, index) => {
            const studentGrades = studentClass.student_grades;
            const avgScore = studentGrades.reduce((acc, grade) => acc + grade.score, 0) / studentGrades.length;
            return {
                id: studentClass.id,
                name: studentClass.student.name,
                average_score: avgScore,
                rank: index + 1 // Rank could be calculated based on the scores
            };
        });

        return res.json({
            id: classData.id,
            name: classData.name,
            grade_level: classData.grade_level,
            total_students: totalStudents,
            subject_averages: subjectAverages,
            class_average: classAverage,
            attendance_percentage: attendancePercentage,
            student_ranks: studentRanks
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error });
    }
});

module.exports = router;