const express = require('express');
const router = express.Router();
const { Class, StudentScore, Attendance, Grade, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// GET: Menampilkan daftar kelas dengan filter grade level
router.get('/classes', accessValidation, roleValidation(['kepala_sekolah']), async (req, res) => {
    try {
        const { grade_level } = req.query; // Filter berdasarkan grade level (Opsional)
        
        const whereClause = {};
        if (grade_level) whereClause.grade_level = grade_level;

        const classes = await Class.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'grade_level'],
            include: [
                {
                    model: StudentScore,
                    as: 'grades',
                    attributes: [[Class.sequelize.fn('AVG', Class.sequelize.col('grades.score')), 'average_score']],
                },
                {
                    model: Attendance,
                    as: 'attendance',
                    attributes: [[Class.sequelize.fn('AVG', Class.sequelize.literal("CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END")), 'attendance_percentage']]
                }
            ],
            group: ['Class.id']
        });

        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET: Menampilkan detail data kelas
router.get('/school/classes/:class_id', accessValidation, roleValidation(['kepala_sekolah']), async (req, res) => {
    try {
        const { class_id } = req.params;

        const classDetail = await Class.findOne({
            where: { id: class_id },
            attributes: ['id', 'name', 'grade_level'],
            include: [
                {
                    model: StudentScore,
                    as: 'grades',
                    attributes: [
                        [Class.sequelize.fn('AVG', Class.sequelize.col('grades.score')), 'average_score']
                    ]
                },
                {
                    model: Attendance,
                    as: 'attendance',
                    attributes: [
                        [Class.sequelize.fn('AVG', Class.sequelize.literal("CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END")), 'attendance_percentage']
                    ]
                },
                {
                    model: StudentScore,
                    as: 'grades',
                    attributes: ['subject_id', [Class.sequelize.fn('AVG', Class.sequelize.col('grades.score')), 'average_subject_score']],
                    include: {
                        model: Subject,
                        as: 'subject',
                        attributes: ['name']
                    },
                    group: ['grades.subject_id']
                }
            ],
            group: ['Class.id']
        });

        if (!classDetail) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Menghitung distribusi nilai siswa (peringkat & kategori nilai)
        const studentScores = await StudentScore.findAll({
            where: { class_id },
            attributes: ['student_id', 'score'],
            order: [['score', 'DESC']]
        });

        const scoreDistribution = {
            excellent: studentScores.filter(s => s.score >= 90).length,
            good: studentScores.filter(s => s.score >= 75 && s.score < 90).length,
            average: studentScores.filter(s => s.score >= 60 && s.score < 75).length,
            poor: studentScores.filter(s => s.score < 60).length
        };

        res.json({
            classDetail,
            scoreDistribution
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;