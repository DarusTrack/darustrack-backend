const { Student } = require('../models');

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      order: [['name', 'ASC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data siswa', error });
  }
};

exports.addStudent = async (req, res) => {
  try {
      const { name, nisn, birth_date, parent_id } = req.body;

      // Cek apakah NISN sudah ada
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

exports.updateStudent = async (req, res) => {
  try {
      const { name, nisn, birth_date, parent_id } = req.body;

      // Cek apakah siswa dengan ID ini ada
      const student = await Student.findByPk(req.params.id);
      if (!student) {
          return res.status(404).json({ message: 'Siswa tidak ditemukan' });
      }

      // Cek jika NISN diubah dan NISN baru sudah dipakai siswa lain
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
  
exports.deleteStudent = async (req, res) => {
    try {
      await Student.destroy({ where: { id: req.params.id } });
      res.json({ message: 'Siswa berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghapus siswa', error });
    }
};