var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Semester } = require('../models');
const v = new Validator();

// put /semester
router.put('/', async (req, res) => {
  try {
    const { semesterId } = req.params;

    const semester = await Semester.findByPk(semesterId);
    if (!semester) return res.status(404).json({ message: 'Semester tidak ditemukan' });

    // Nonaktifkan semester lain dalam tahun ajaran yang sama
    await Semester.update(
      { is_active: false },
      { where: { academic_year_id: semester.academic_year_id } }
    );

    // Aktifkan semester ini
    semester.is_active = true;
    await semester.save();

    res.json({ message: 'Semester aktif diperbarui', data: semester });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
  