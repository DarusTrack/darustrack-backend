const express = require('express');
const router = express.Router();
const { Class, Student, StudentGrade, GradeCategory, GradeDetail, Attendance, Subject } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');

router.get('/classes', async (req, res) => {
    try {
        const classes = await Class.findAll({
            include: [
                {
                    model: Student,
                    as: 'students',
                    include: [
                        {
                            model: StudentGrade,
                            as: 'student_grade',
                            include: [{ model: GradeDetail, as: 'grade_detail' }]
                        },
                        { model: Attendance, as: 'attendance' }
                    ]
                }
            ]
        });

        console.log('Fetched Classes:', classes);
        
        const formattedClasses = classes.map(cls => {
            const students = cls.students || [];
            const totalStudents = students.length;

            let totalScores = 0;
            let totalGrades = 0;
            students.forEach(student => {
                (student.student_grade || []).forEach(grade => {
                    if (grade.score !== null) {
                        totalScores += grade.score;
                        totalGrades++;
                    }
                });
            });
            const averageScore = totalGrades ? (totalScores / totalGrades).toFixed(2) : 0;

            let totalPresent = 0;
            let totalAttendances = 0;
            students.forEach(student => {
                (student.attendance || []).forEach(att => {
                    if (att.status === 'Hadir') totalPresent++;
                    totalAttendances++;
                });
            });
            console.log(`Class: ${cls.name}, Total Present: ${totalPresent}, Total Attendances: ${totalAttendances}`);
            const attendancePercentage = totalAttendances ? ((totalPresent / totalAttendances) * 100).toFixed(2) : 0;

            return {
                id: cls.id,
                name: cls.name,
                grade_level: cls.grade_level,
                total_students: totalStudents,
                average_score: averageScore,
                attendance_percentage: attendancePercentage
            };
        });

        res.json(formattedClasses);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/classes/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const cls = await Class.findByPk(classId, {
            include: [
                {
                    model: Student,
                    as: 'students',
                    include: [
                        {
                            model: StudentGrade,
                            as: 'student_grade',
                            include: [{ 
                                model: GradeDetail, 
                                as: 'grade_detail',
                                include: [{ 
                                    model: GradeCategory, 
                                    as: 'grade_category',
                                    include: [{ model: Subject, as: 'subject' }] // ✅ Subject diambil dari GradeCategory
                                }]
                            }]                            
                        },
                        { model: Attendance, as: 'attendance' }
                    ]
                }
            ]
        });

        if (!cls) return res.status(404).json({ error: "Class not found" });

        console.log('Fetched Class:', cls);
        const students = cls.students || [];
        const totalStudents = students.length; // ✅ Menambahkan jumlah siswa

        let subjectScores = {};
        let totalScores = 0;
        let totalGrades = 0;

        students.forEach(student => {
            (student.student_grade || []).forEach(grade => {
                if (grade.score !== null && grade.grade_detail && grade.grade_detail.grade_category && grade.grade_detail.grade_category.subject) {
                    const subjectId = grade.grade_detail.grade_category.subject.id;
                    const subjectName = grade.grade_detail.grade_category.subject.name;

                    if (!subjectScores[subjectId]) {
                        subjectScores[subjectId] = { name: subjectName, total: 0, count: 0 };
                    }
                    subjectScores[subjectId].total += grade.score;
                    subjectScores[subjectId].count++;
                    totalScores += grade.score;
                    totalGrades++;
                }
            });
        });

        // Mengonversi hasil subjectScores menjadi array
        const subjectAverages = Object.keys(subjectScores).map(subjectId => ({
            subject_id: subjectId,
            subject_name: subjectScores[subjectId].name,
            average_score: subjectScores[subjectId].count ? (subjectScores[subjectId].total / subjectScores[subjectId].count).toFixed(2) : "0.00"
        }));

        const averageScore = totalGrades ? (totalScores / totalGrades).toFixed(2) : "0.00";

        let totalPresent = 0;
        let totalAttendances = 0;
        students.forEach(student => {
            (student.attendance || []).forEach(att => {
                if (att.status === 'Hadir') totalPresent++;
                totalAttendances++;
            });
        });

        console.log(`Class ID: ${classId}, Total Present: ${totalPresent}, Total Attendances: ${totalAttendances}`);
        const attendancePercentage = totalAttendances ? ((totalPresent / totalAttendances) * 100).toFixed(2) : "0.00";

        const studentRanks = students.map(student => {
            let studentTotalScore = 0;
            let studentTotalGrades = 0;
            (student.student_grade || []).forEach(grade => {
                if (grade.score !== null) {
                    studentTotalScore += grade.score;
                    studentTotalGrades++;
                }
            });
            return {
                id: student.id,
                name: student.name,
                average_score: studentTotalGrades ? (studentTotalScore / studentTotalGrades).toFixed(2) : "0.00"
            };
        });

        studentRanks.sort((a, b) => b.average_score - a.average_score);
        studentRanks.forEach((student, index) => {
            student.rank = index + 1;
        });

        res.json({
            class_id: cls.id,
            class_name: cls.name,
            grade_level: cls.grade_level,
            total_students: totalStudents, // ✅ Menampilkan jumlah siswa
            subject_averages: subjectAverages,
            class_average: averageScore,
            attendance_percentage: attendancePercentage,
            student_ranks: studentRanks
        });
    } catch (error) {
        console.error('Error fetching class details:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;