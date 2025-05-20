const express = require('express');
const router = express.Router();
const { Student } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op } = require('sequelize');

// Gunakan hanya field yang dibutuhkan dan tambahkan indexing di DB untuk field 'name' dan 'nisn'
router.get('/', accessValidation, roleValidation(['admin']), async (req, res) => {
  try {
    const students = await Student.findAll({
      attributes: ['id', 'name', 'nisn'], // hanya ambil field penting
      order: [['name', 'ASC']],
      raw: true // menghindari instance Sequelize untuk respons lebih cepat
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data siswa', error: error.message });
  }
});

router.post('/', accessValidation, roleValidation(['admin']), async (req, res) => {
  try {
    const { name, nisn, birth_date, parent_id } = req.body;

    // Gunakan indexing di database untuk kolom 'nisn' agar pencarian cepat
    const existing = await Student.findOne({ where: { nisn }, attributes: ['id'], raw: true });
    if (existing) {
      return res.status(409).json({ message: 'Siswa dengan NISN ini sudah terdaftar' });
    }

    const newStudent = await Student.create({ name, nisn, birth_date, parent_id });
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan siswa', error: error.message });
  }
});

router.put('/:id', accessValidation, roleValidation(['admin']), async (req, res) => {
  try {
    const { name, nisn, birth_date, parent_id } = req.body;

    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    if (nisn && nisn !== student.nisn) {
      const existing = await Student.findOne({ 
        where: { nisn, id: { [Op.ne]: student.id } },
        attributes: ['id'],
        raw: true
      });
      if (existing) {
        return res.status(409).json({ message: 'NISN sudah digunakan oleh siswa lain' });
      }
    }

    await student.update({ name, nisn, birth_date, parent_id });
    res.json({ message: 'Siswa berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui siswa', error: error.message });
  }
});

router.delete('/:id', accessValidation, roleValidation(['admin']), async (req, res) => {
  try {
    const deleted = await Student.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }
    res.json({ message: 'Siswa berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus siswa', error: error.message });
  }
});

module.exports = router;
