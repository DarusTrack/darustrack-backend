var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { AcademicYear, Semester } = require('../models');
const v = new Validator();

// Daftar semester tahun ajaran aktif (kehadiran dan evaluasi)
router.get('/', async (req, res) => {
    try {
        const semesters = await Semester.findAll({
            attributes: ['id', 'name', 'is_active'],
            include: {
                model: AcademicYear,
                as: 'academic_year',
                attributes: ['id', 'year', 'is_active'],
                where: { is_active: true },
                required: true
            }
        });

        res.json(semesters);
    } catch (error) {
        console.error('Semester GET Error:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

module.exports = router