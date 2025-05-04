const { AcademicYear, Semester } = require('../models');

// GET - Daftar semester dari tahun ajaran yang aktif
exports.getSemestersOfActiveAcademicYear = async (req, res) => {
  try {
    const semesters = await Semester.findAll({
      attributes: ['id', 'name', 'is_active'],
      include: {
        model: AcademicYear,
        as: 'academic_year',
        attributes: ['id', 'year', 'is_active'],
        where: { is_active: true }
      }
    });

    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
