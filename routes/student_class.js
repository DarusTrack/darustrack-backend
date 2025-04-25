const express = require('express');
const router = express.Router();
const { StudentClass, Student, Class, Semester, AcademicYear } = require('../models');

// ✅ GET: Ambil semua penempatan siswa berdasarkan semester aktif
router.get('/', async (req, res) => {
  try {
    const activeAcademicYear = await AcademicYear.findOne({ where: { is_active: true } });

    if (!activeAcademicYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const activeSemester = await Semester.findOne({
      where: {
        academic_year_id: activeAcademicYear.id,
        is_active: true
      }
    });

    if (!activeSemester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });

    const studentClasses = await StudentClass.findAll({
      where: { semester_id: activeSemester.id },
      include: [
        { model: Student },
        { model: Class }
      ]
    });

    res.json(studentClasses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST: Tambah penempatan siswa ke kelas di semester aktif
router.post('/', async (req, res) => {
  try {
    const { student_id, class_id } = req.body;

    const activeAcademicYear = await AcademicYear.findOne({ where: { is_active: true } });
    const activeSemester = await Semester.findOne({ 
      where: { academic_year_id: activeAcademicYear.id, is_active: true } 
    });

    if (!activeAcademicYear || !activeSemester) {
      return res.status(400).json({ message: 'Tahun ajaran atau semester aktif tidak tersedia' });
    }

    const newEntry = await StudentClass.create({
      student_id,
      class_id,
      semester_id: activeSemester.id
    });

    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ PUT: Update penempatan siswa (ubah kelas atau semester jika perlu)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, class_id, semester_id } = req.body;

    const studentClass = await StudentClass.findByPk(id);

    if (!studentClass) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    studentClass.student_id = student_id ?? studentClass.student_id;
    studentClass.class_id = class_id ?? studentClass.class_id;
    studentClass.semester_id = semester_id ?? studentClass.semester_id;

    await studentClass.save();

    res.json({ message: 'Data berhasil diperbarui', data: studentClass });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ DELETE: Hapus entri penempatan siswa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await StudentClass.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: 'Data tidak ditemukan atau sudah dihapus' });
    }

    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
