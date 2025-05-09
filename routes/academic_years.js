var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { AcademicYear, Semester, StudentClass, Class, Student } = require('../models');
const { Op } = require('sequelize');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const v = new Validator();

// GET semua tahun ajaran dengan semester aktif
router.get('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const academicYears = await AcademicYear.findAll({
          include: [
            {
              model: Semester,
              as: 'semester',
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

// POST - Tambah Tahun Ajaran Baru
router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { year, is_active = false } = req.body;

    const existingAcademicYear = await AcademicYear.findOne({ where: { year } });
    if (existingAcademicYear) {
      return res.status(400).json({ message: 'Tahun ajaran sudah ada.' });
    }

    // Jika tahun ajaran baru akan diaktifkan, nonaktifkan semua tahun ajaran aktif dan semester-nya
    if (is_active) {
      const activeAcademicYears = await AcademicYear.findAll({ where: { is_active: true } });
      for (const ay of activeAcademicYears) {
        await ay.update({ is_active: false });
        await Semester.update(
          { is_active: false },
          { where: { academic_year_id: ay.id } }
        );
      }
    }

    // Buat tahun ajaran baru
    const newAcademicYear = await AcademicYear.create({ year, is_active });

    // Jika tahun ajaran baru tidak aktif, nonaktifkan semester-nya (setelah hook afterCreate berjalan)
    if (!is_active) {
      await Semester.update(
        { is_active: false },
        { where: { academic_year_id: newAcademicYear.id } }
      );
    }

    res.status(201).json({
      message: `Tahun ajaran berhasil ditambahkan${is_active ? ' dan diaktifkan' : ''}.`,
      data: newAcademicYear
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
});

// PUT - Update Tahun Ajaran
router.put('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { year, is_active } = req.body;

    const academicYear = await AcademicYear.findByPk(id, {
      include: [{ model: Semester, as: 'semester' }]
    });

    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    console.log('Academic Year found:', academicYear.toJSON());

    // Kalau mau update is_active ke true, matikan semua dulu
    if (typeof is_active !== 'undefined' && is_active) {
      await AcademicYear.update({ is_active: false }, { where: {} });
    }

    // Update field satu-satu
    if (typeof year !== 'undefined' && academicYear.year !== year) {
      // Cek apakah year sudah dipakai entri lain
      const existing = await AcademicYear.findOne({ where: { year } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: `Tahun ajaran '${year}' sudah ada.` });
      }
      academicYear.year = year;
    }

    if (typeof is_active !== 'undefined') {
      academicYear.is_active = is_active;
    }

    await academicYear.save();

    // Kalau tahun ajaran dinonaktifkan, nonaktifkan semua semester-nya
    if (typeof is_active !== 'undefined' && !is_active) {
      await Semester.update(
        { is_active: false },
        { where: { academic_year_id: id } }
      );
    }

    res.json({ message: 'Tahun ajaran berhasil diperbarui' });

  } catch (error) {
    console.error('Error di PUT /academic-years/:id', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
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
// perbarui status semester di tahun ajaran aktif
router.put('/semester/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active harus berupa boolean' });
    }

    const semesterToUpdate = await Semester.findByPk(req.params.id);

    if (!semesterToUpdate) {
      return res.status(404).json({ message: 'Semester tidak ditemukan' });
    }

    const academicYear = await AcademicYear.findByPk(semesterToUpdate.academic_year_id);
    if (!academicYear || !academicYear.is_active) {
      return res.status(400).json({ message: 'Semester ini tidak berasal dari tahun ajaran aktif' });
    }

    if (is_active) {
      // Jika ingin mengaktifkan semester ini, nonaktifkan semua semester lain terlebih dahulu
      await Semester.update({ is_active: false }, {
        where: { academic_year_id: academicYear.id }
      });
    }

    // Ubah status aktif semester sesuai permintaan
    semesterToUpdate.is_active = is_active;
    await semesterToUpdate.save();

    res.json({ message: `Semester berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
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
          as: 'class',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const classList = academicYear.class.map(cls => {
      const gradeLevel = parseInt(cls.name.charAt(0));
      return {
        id: cls.id,
        name: cls.name,
        grade_level: isNaN(gradeLevel) ? null : gradeLevel
      };
    });

    // Urutkan kelas berdasarkan nama kelas (alphabetical)
    classList.sort((a, b) => a.name.localeCompare(b.name)); // Urutkan berdasarkan nama kelas

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

    // Cek apakah kelas dengan nama yang sama sudah ada di tahun ajaran yang sama
    const existingClass = await Class.findOne({
      where: {
        name,
        academic_year_id: id
      }
    });

    if (existingClass) {
      return res.status(400).json({ message: 'Kelas dengan nama yang sama sudah ada di tahun ajaran ini' });
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

    // Update hanya name dan teacher_id yang valid
    const updateFields = {};

    // Jika 'name' ada, update 'name'
    if (name) {
      updateFields.name = name;
    }

    // Jika 'teacher_id' ada, update 'teacher_id'
    if (teacher_id) {
      updateFields.teacher_id = teacher_id;
    }

    // Melakukan update hanya jika ada perubahan
    if (Object.keys(updateFields).length > 0) {
      await existingClass.update(updateFields);
    }

    res.json({ message: 'Kelas berhasil diperbarui', data: existingClass });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
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
          model: StudentClass,
          as: 'student_class',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'name', 'nisn', 'birth_date', 'parent_id']
            }
          ]
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran ini' });
    }

    // Menyusun response untuk daftar siswa
    let students = classData.student_class ? classData.student_class.map(sc => sc.student) : [];

    // Urutkan daftar siswa berdasarkan nama
    students = students.sort((a, b) => a.name.localeCompare(b.name)); // Urutkan berdasarkan nama siswa

    // Kirim response
    res.json({
      class_id: classData.id,
      class_name: classData.name,
      students: students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
  }
});

// Menambahkan siswa ke kelas pada tahun ajaran tertentu
router.post('/:academicYearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), async (req, res) => {
  try {
    const { academicYearId, classId } = req.params;
    const { studentIds } = req.body;

    // Validasi ID
    if (!academicYearId || !classId) {
      return res.status(400).json({ message: 'Academic Year ID atau Class ID tidak ditemukan' });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Harap sertakan ID siswa yang valid dalam format array.' });
    }

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

    // Validasi siswa ada
    const students = await Student.findAll({ where: { id: studentIds } });
    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Beberapa siswa tidak ditemukan' });
    }

    // Ambil semua entri StudentClass untuk tahun ajaran ini
    const classesInYear = await Class.findAll({
      where: { academic_year_id: academicYearId },
      attributes: ['id']
    });
    const classIdsInYear = classesInYear.map(c => c.id);

    // Cek apakah ada siswa yang sudah terdaftar di kelas lain dalam tahun ajaran yang sama
    const existingStudentAssignments = await StudentClass.findAll({
      where: {
        student_id: studentIds,
        class_id: classIdsInYear
      }
    });

    if (existingStudentAssignments.length > 0) {
      const alreadyAssignedIds = existingStudentAssignments.map(entry => entry.student_id);
      return res.status(400).json({
        message: 'Tidak dapat menambahkan siswa dikarenakan terdapat siswa yang sudah terdaftar di kelas lain dalam tahun ajaran ini.',
        student_ids: alreadyAssignedIds
      });
    }

    // Buat entri StudentClass baru
    const studentClasses = studentIds.map(studentId => ({
      student_id: studentId,
      class_id: classId
    }));

    await StudentClass.bulkCreate(studentClasses);

    res.status(201).json({ message: 'Siswa berhasil ditambahkan ke kelas.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
});

// Menghapus siswa dari kelas pada tahun ajaran tertentu
router.delete('/:academicYearId/classes/:classId/students/:studentId', async (req, res) => {
  const { academicYearId, classId, studentId } = req.params;

  try {
    // Pastikan tahun ajaran dan kelas valid
    const academicYear = await AcademicYear.findByPk(academicYearId);
    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const classData = await Class.findOne({
      where: { id: classId, academic_year_id: academicYearId }
    });
    if (!classData) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan pada tahun ajaran ini' });
    }

    // Temukan entri di tabel student_classes untuk menghapus relasi
    const studentClass = await StudentClass.findOne({
      where: {
        student_id: studentId,
        class_id: classId
      }
    });

    if (!studentClass) {
      return res.status(404).json({ message: 'Siswa tidak terdaftar dalam kelas ini' });
    }

    // Hapus relasi siswa dari kelas
    await studentClass.destroy();
    
    res.status(200).json({ message: 'Siswa berhasil dihapus dari kelas' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus siswa dari kelas', error });
  }
});

module.exports = router;