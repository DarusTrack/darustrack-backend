const express = require('express');
const router = express.Router();
const { Class, StudentScore, Attendance, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op, fn, col, literal } = require('sequelize');

// GET: Menampilkan daftar kelas dengan informasi rata-rata nilai & kehadiran
router.get('/classes', accessValidation, roleValidation(['kepala_sekolah']), async (req, res) => {
    try {
        const classes = await Class.findAll({
            attributes: [
                'id', 
                'name',
                [fn('COALESCE', fn('AVG', col('grades.score')), 0), 'average_score'],
                [fn('COALESCE', fn('AVG', literal("CASE WHEN attendance.status = 'Hadir' THEN 1 ELSE 0 END")), 0), 'attendance_percentage']
            ],
            include: [
                {
                    model: StudentScore,
                    as: 'grades',
                    attributes: []
                },
                {
                    model: Attendance,
                    as: 'attendance',
                    attributes: []
                }
            ],
            group: ['Class.id'],
            raw: true,
            nest: true
        });

        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET: Menampilkan detail data kelas
router.get('/classes/:class_id', accessValidation, roleValidation(['kepala_sekolah']), async (req, res) => {
    try {
        const { class_id } = req.params;

        // Ambil detail kelas
        const classDetail = await Class.findOne({
            where: { id: class_id },
            attributes: ['id', 'name', 'grade_level'],
            raw: true,
            nest: true
        });

        if (!classDetail) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Ambil rata-rata nilai kelas
        const avgScore = await StudentScore.findOne({
            where: { class_id },
            attributes: [[fn('COALESCE', fn('AVG', col('score')), 0), 'average_score']],
            raw: true
        });

        // Ambil persentase kehadiran
        const attendancePercentage = await Attendance.findOne({
            where: { class_id },
            attributes: [[fn('COALESCE', fn('AVG', literal("CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END")), 0), 'attendance_percentage']],
            raw: true
        });

        // Ambil rata-rata nilai per mata pelajaran
        const subjectScores = await StudentScore.findAll({
            where: { class_id },
            attributes: ['subject_id', [fn('AVG', col('score')), 'average_subject_score']],
            include: {
                model: Subject,
                as: 'subject',
                attributes: ['name']
            },
            group: ['subject_id'],
            raw: true,
            nest: true
        });

        // Menghitung distribusi nilai siswa
        const studentScores = await StudentScore.findAll({
            where: { class_id },
            attributes: ['score'],
            raw: true
        });

        const scoreDistribution = {
            excellent: studentScores.filter(s => s.score >= 90).length,
            good: studentScores.filter(s => s.score >= 75 && s.score < 90).length,
            average: studentScores.filter(s => s.score >= 60 && s.score < 75).length,
            poor: studentScores.filter(s => s.score < 60).length
        };

        res.json({
            classDetail,
            average_score: avgScore?.average_score || 0,
            attendance_percentage: attendancePercentage?.attendance_percentage || 0,
            subjectScores,
            scoreDistribution
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
