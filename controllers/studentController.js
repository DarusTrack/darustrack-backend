const { Student } = require('../models');
const { Op } = require('sequelize');

// GET - Semua siswa
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data siswa', error });
  }
};

// POST - Tambah siswa baru
exports.createStudent = async (req, res) => {
  try {
    const { name, nisn, birth_date, parent_id } = req.body;

    const existingStudent = await Student.findOne({ where: { nisn } });
    if (existingStudent) {
      return res.status(409).json({ message: 'Siswa dengan NISN ini sudah terdaftar' });
    }

    const newStudent = await Student.create({ name, nisn, birth_date, parent_id });
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan siswa', error: error.message });
  }
};

// PUT - Perbarui data siswa
exports.updateStudent = async (req, res) => {
  try {
    const { name, nisn, birth_date, parent_id } = req.body;
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    if (nisn && nisn !== student.nisn) {
      const existingStudent = await Student.findOne({ where: { nisn } });
      if (existingStudent && existingStudent.id !== student.id) {
        return res.status(409).json({ message: 'NISN sudah digunakan oleh siswa lain' });
      }
    }

    await student.update({ name, nisn, birth_date, parent_id });
    res.json({ message: 'Siswa berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui siswa', error: error.message });
  }
};

// DELETE - Hapus siswa
exports.deleteStudent = async (req, res) => {
  try {
    await Student.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Siswa berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus siswa', error });
  }
};
