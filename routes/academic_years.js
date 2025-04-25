var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { AcademicYear, Semester, StudentClass, Class, Student } = require('../models');
const { Op } = require('sequelize');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const v = new Validator();

// * TAHUN AJARAN *
// GET semua tahun ajaran dengan semester aktif
router.get('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const academicYears = await AcademicYear.findAll({
          include: [
            {
              model: Semester,
              attributes: ['id', 'name', 'is_active', 'start_date', 'end_date']
            }
          ],
          order: [['year', 'DESC']]
        });
    
        res.json(academicYears);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST tahun ajaran baru
router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { year } = req.body;
  
      // Cari semua tahun ajaran yang aktif
      const allAcademicYears = await AcademicYear.findAll();
  
      // Nonaktifkan semua tahun ajaran lain satu per satu (agar trigger hook berjalan)
      for (const ay of allAcademicYears) {
        if (ay.is_active) {
          ay.is_active = false;
          await ay.save(); // trigger hook: nonaktifkan semester juga
        }
      }
  
      // Buat tahun ajaran baru (otomatis aktif)
      const newAcademicYear = await AcademicYear.create({ year, is_active: true });
  
      res.status(201).json({
        message: 'Tahun ajaran berhasil ditambahkan dan diaktifkan.',
        data: newAcademicYear
      });
  
    }catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          return res.status(400).json({ message: 'Tahun ajaran sudah ada.' });
        }
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }      
});  

// PUT update tahun ajaran
router.put('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
  
      const academicYear = await AcademicYear.findByPk(id, {
        include: [{ model: Semester }]
      });
  
      if (!academicYear) {
        return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
      }
  
      // Jika mengaktifkan tahun ajaran, nonaktifkan tahun ajaran lainnya
      if (is_active) {
        await AcademicYear.update({ is_active: false }, { where: {} });
      }
  
      // Update tahun ajaran
      academicYear.is_active = is_active;
      await academicYear.save();
  
      // Jika tahun ajaran dinonaktifkan, otomatis nonaktifkan semua semester-nya
      if (!is_active) {
        await Semester.update(
          { is_active: false },
          { where: { academic_year_id: id } }
        );
      }
  
      res.json({ message: 'Tahun ajaran berhasil diperbarui' });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          return res.status(400).json({ message: 'Tahun ajaran sudah ada.' });
        }
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }      
});

// DELETE tahun ajaran
router.delete('/:id', accessValidation, async (req, res) => {
  try {
    await AcademicYear.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted Successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// * SEMESTER *
// PUT update semester aktif di tahun ajaran aktif
router.put('/semester/:id/activate', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const semesterToActivate = await Semester.findByPk(req.params.id);
  
      if (!semesterToActivate) {
        return res.status(404).json({ message: 'Semester tidak ditemukan' });
      }
  
      // Pastikan semester ini milik tahun ajaran yang aktif
      const academicYear = await AcademicYear.findByPk(semesterToActivate.academic_year_id);
      if (!academicYear || !academicYear.is_active) {
        return res.status(400).json({ message: 'Semester ini tidak berasal dari tahun ajaran aktif' });
      }
  
      // Nonaktifkan semester lain dalam tahun ajaran ini
      await Semester.update({ is_active: false }, {
        where: { academic_year_id: academicYear.id }
      });
  
      // Aktifkan semester yang dipilih
      semesterToActivate.is_active = true;
      await semesterToActivate.save();
  
      res.json({ message: 'Semester berhasil diaktifkan' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

// * KELAS *
// GET detail tahun ajaran by ID + daftar kelas di semester Ganjil
router.get('/:id/classes', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
  
      const academicYear = await AcademicYear.findByPk(id, {
        include: [
          {
            model: Semester,
            attributes: ['id', 'name'],
            include: [
              {
                model: Class, // INI YANG PENTING
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });
  
      if (!academicYear) {
        return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
      }
  
      const ganjilSemester = academicYear.Semesters.find(s => s.name === 'Ganjil');
  
      if (!ganjilSemester) {
        return res.status(404).json({ message: 'Semester Ganjil tidak ditemukan di tahun ajaran ini' });
      }
  
      if (!ganjilSemester.Classes) {
        return res.status(200).json({
          id: academicYear.id,
          year: academicYear.year,
          is_active: academicYear.is_active,
          classes: []
        });
      }
  
      const classList = ganjilSemester.Classes.map(cls => ({
        id: cls.id,
        name: cls.name
      }));
  
      res.json({
        id: academicYear.id,
        year: academicYear.year,
        is_active: academicYear.is_active,
        classes: classList
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});
  
// POST /academic-years/:id/classes
router.post('/:id/classes', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { id } = req.params; // academicYearId
      const { name, teacher_id } = req.body;
  
      const academicYear = await AcademicYear.findByPk(id, {
        include: [Semester]
      });
  
      if (!academicYear) return res.status(404).json({ message: "Tahun ajaran tidak ditemukan" });
  
      const semesters = academicYear.Semesters;
      if (semesters.length !== 2) return res.status(400).json({ message: "Tahun ajaran harus memiliki dua semester" });
  
      // Tambahkan kelas ke dua semester
      const createdClasses = await Promise.all(semesters.map(semester => {
        return Class.create({
          name,
          teacher_id,
          semester_id: semester.id
        });
      }));
  
      res.status(201).json({
        message: "Kelas berhasil ditambahkan ke tahun ajaran",
        classes: createdClasses
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menambahkan kelas", error });
    }
});  

// PUT /academic-years/classes/:classId
router.put('/classes/:classId', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { classId } = req.params;
      const { name, teacher_id } = req.body;
  
      const targetClass = await Class.findByPk(classId);
      if (!targetClass) return res.status(404).json({ message: "Kelas tidak ditemukan" });
  
      // Update hanya jika value tersedia
      if (name !== undefined) targetClass.name = name;
      if (teacher_id !== undefined) targetClass.teacher_id = teacher_id;
  
      await targetClass.save();
  
      res.json({ message: "Kelas berhasil diperbarui", class: targetClass });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat mengedit kelas" });
    }
});  
  
// DELETE /academic-years/:id/classes/:classId
router.delete('/classes/:classId', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { classId } = req.params;
  
      const targetClass = await Class.findByPk(classId);
      if (!targetClass) return res.status(404).json({ message: "Kelas tidak ditemukan" });
  
      // Hapus StudentClass yang mengacu ke kelas ini (dari kedua semester)
      await StudentClass.destroy({ where: { class_id: classId } });
  
      // Hapus Class
      await targetClass.destroy();
  
      res.json({ message: "Kelas berhasil dihapus dari tahun ajaran" });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menghapus kelas" });
    }
});

// * SISWA *
// ambil data siswa kelas
router.get('/:yearId/classes/:classId/students', accessValidation, roleValidation(["admin", "wali_kelas"]), async (req, res) => {
    try {
      const { yearId, classId } = req.params;
  
      // Cari tahun ajaran dan semester terkait
      const academicYear = await AcademicYear.findByPk(yearId, {
        include: [Semester]
      });
      if (!academicYear) return res.status(404).json({ message: "Tahun ajaran tidak ditemukan" });
  
      // Pastikan tahun ajaran memiliki dua semester
      if (academicYear.Semesters.length !== 2) {
        return res.status(400).json({ message: "Tahun ajaran harus memiliki dua semester" });
      }
  
      const semesterIds = academicYear.Semesters.map(s => s.id);
  
      // Ambil siswa berdasarkan kelas dan semester melalui StudentClass dan Class
      const studentClasses = await StudentClass.findAll({
        where: {
          class_id: classId,
        },
        include: [
          {
            model: Student,
            attributes: ['id', 'name', 'nisn', 'birth_date', 'parent_id'],
            required: true, // memastikan hanya siswa yang terdaftar yang diambil
          },
          {
            model: Class,
            where: {
              semester_id: {
                [Op.in]: semesterIds, // Filter berdasarkan semester yang terhubung dengan tahun ajaran
              }
            },
            required: true,
          }
        ]
      });
  
      // Filter siswa untuk memastikan tidak ada duplikat berdasarkan ID siswa
      const uniqueStudents = [];
      const seenStudentIds = new Set();
  
      studentClasses.forEach(sc => {
        const student = sc.Student;
        if (!seenStudentIds.has(student.id)) {
          uniqueStudents.push(student);
          seenStudentIds.add(student.id);
        }
      });
  
      if (!uniqueStudents.length) {
        return res.status(404).json({ message: "Tidak ada siswa terdaftar di kelas ini" });
      }
  
      res.json({
        class_id: classId,
        students: uniqueStudents // Menampilkan data siswa yang unik
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat mengambil data siswa" });
    }
});  

// tambah siswa ke dalam kelas
router.post('/:yearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { yearId, classId } = req.params;
      const { student_ids } = req.body;
  
      if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: "Daftar siswa tidak boleh kosong" });
      }
  
      // Cek tahun ajaran dan ambil dua semester
      const academicYear = await AcademicYear.findByPk(yearId, {
        include: [Semester]
      });
      if (!academicYear) return res.status(404).json({ message: "Tahun ajaran tidak ditemukan" });
  
      if (academicYear.Semesters.length !== 2) {
        return res.status(400).json({ message: "Tahun ajaran harus memiliki dua semester" });
      }
  
      // Cek kelas
      const kelas = await Class.findByPk(classId);
      if (!kelas) return res.status(404).json({ message: "Kelas tidak ditemukan" });
  
      // Tambahkan siswa ke setiap semester
      const studentClassRecords = [];
      for (const semester of academicYear.Semesters) {
        for (const student_id of student_ids) {
          studentClassRecords.push({
            semester_id: semester.id,
            class_id: classId,
            student_id: student_id
          });
        }
      }
  
      // Masukkan ke tabel StudentClass
      await StudentClass.bulkCreate(studentClassRecords, { ignoreDuplicates: true });
  
      res.status(201).json({ message: "Siswa berhasil ditambahkan ke kelas dalam dua semester" });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menambahkan siswa ke kelas" });
    }
});

// hapus siswa dalam kelas
router.delete('/:yearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { yearId, classId } = req.params;
      const { student_ids } = req.body;
  
      if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: "Daftar siswa tidak boleh kosong" });
      }
  
      // Cari tahun ajaran dan semester
      const academicYear = await AcademicYear.findByPk(yearId, {
        include: [Semester]
      });
      if (!academicYear) return res.status(404).json({ message: "Tahun ajaran tidak ditemukan" });
  
      if (academicYear.Semesters.length !== 2) {
        return res.status(400).json({ message: "Tahun ajaran harus memiliki dua semester" });
      }
  
      const semesterIds = academicYear.Semesters.map(s => s.id);
  
      // Hapus data dari StudentClass berdasarkan kombinasi semester, kelas, dan siswa
      const deleted = await StudentClass.destroy({
        where: {
          semester_id: semesterIds,
          class_id: classId,
          student_id: student_ids
        }
      });
  
      res.json({ message: "Siswa berhasil dihapus dari kelas", deleted });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menghapus siswa dari kelas" });
    }
});
  
module.exports = router;