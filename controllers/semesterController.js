const { AcademicYear, Semester } = require('../models');

// Daftar semester tahun ajaran aktif (kehadiran dan evaluasi)
exports.getAllSemesters = async (req, res) => {
    try {
        const semesters = await Semester.findAll({
            attributes: ['id', 'name', 'is_active'],  // Menambahkan attributes untuk Semester
            include: {
                model: AcademicYear,
                as: 'academic_year',
                attributes: ['id', 'year', 'is_active'],  // Menambahkan attributes untuk AcademicYear
                where: { is_active: true }
            }
        });
        res.json(semesters);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};