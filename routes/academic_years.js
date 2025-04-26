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
              attributes: ['id', 'name', 'is_active']
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
// GET detail tahun ajaran by ID + daftar kelas
router.get('/:id/classes', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const academicYear = await AcademicYear.findByPk(id, {
      include: [
        {
          model: Class,
          as: 'classes',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const classList = academicYear.classes.map(cls => ({
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

// CREATE Class dalam tahun ajaran tertentu
router.post('/:id/classes', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, teacher_id } = req.body;

    const academicYear = await AcademicYear.findByPk(id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const newClass = await Class.create({
      name,
      teacher_id,
      academic_year_id: id
    });

    res.status(201).json(newClass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// UPDATE Class
router.put('/classes/:classId', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, teacher_id } = req.body;

    const existingClass = await Class.findByPk(classId);
    if (!existingClass) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }

    await existingClass.update({
      name,
      teacher_id
    });

    res.json({ message: 'Kelas berhasil diperbarui', data: existingClass });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// DELETE Class
router.delete('/classes/:classId', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { classId } = req.params;

    const existingClass = await Class.findByPk(classId);
    if (!existingClass) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }

    await existingClass.destroy();

    res.json({ message: 'Kelas berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// * SISWA *
// Tampilkan daftar siswa di kelas tertentu pada tahun ajaran tertentu
router.get('/:academicYearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { academicYearId, classId } = req.params;

    // Cek tahun ajaran
    const academicYear = await AcademicYear.findByPk(academicYearId);
    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    // Cek kelas
    const classData = await Class.findOne({
      where: {
        id: classId,
        academic_year_id: academicYearId
      },
      include: [
        {
          model: Student,
          as: 'students',
          through: { attributes: [] }, // tidak ambil data dari pivot table StudentClass
          attributes: ['id', 'name', 'nisn', 'birth_date', 'parent_id'] // ambil field yang diperlukan
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran ini' });
    }

    res.json({
      class_id: classData.id,
      class_name: classData.name,
      students: classData.students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
  }
});

// Menambahkan siswa ke kelas di tahun ajaran tertentu
router.post('/:academicYearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { academicYearId, classId } = req.params;
    const { student_ids } = req.body; // array of student_id

    // Validasi tahun ajaran
    const academicYear = await AcademicYear.findByPk(academicYearId);
    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    // Validasi kelas
    const classData = await Class.findOne({
      where: {
        id: classId,
        academic_year_id: academicYearId
      }
    });

    if (!classData) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran ini' });
    }

    // Validasi student_ids harus ada
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ message: 'student_ids harus berupa array yang berisi ID siswa' });
    }

    // Cek apakah semua siswa ada
    const students = await Student.findAll({
      where: {
        id: student_ids
      }
    });

    if (students.length !== student_ids.length) {
      return res.status(400).json({ message: 'Beberapa ID siswa tidak ditemukan' });
    }

    // Masukkan siswa ke kelas
    const studentClassData = student_ids.map(studentId => ({
      student_id: studentId,
      class_id: classId
    }));

    await StudentClass.bulkCreate(studentClassData, { ignoreDuplicates: true });

    res.status(201).json({ message: 'Siswa berhasil dimasukkan ke dalam kelas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// Menghapus siswa dari kelas di tahun ajaran tertentu
router.delete('/:academicYearId/classes/:classId/students/:studentId', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { academicYearId, classId, studentId } = req.params;

    // Cek tahun ajaran
    const academicYear = await AcademicYear.findByPk(academicYearId);
    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    // Cek kelas
    const classData = await Class.findOne({
      where: {
        id: classId,
        academic_year_id: academicYearId
      }
    });

    if (!classData) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran ini' });
    }

    // Cek apakah siswa ada di kelas tersebut
    const studentClass = await StudentClass.findOne({
      where: {
        class_id: classId,
        student_id: studentId
      }
    });

    if (!studentClass) {
      return res.status(404).json({ message: 'Siswa tidak terdaftar dalam kelas ini' });
    }

    // Hapus data dari pivot StudentClass
    await studentClass.destroy();

    res.json({ message: 'Siswa berhasil dihapus dari kelas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});


module.exports = router;