var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { AcademicYear, Semester, StudentClass, Class, Student } = require('../models');
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
  
    } catch (error) {
      res.status(500).json({ message: error.message });
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
      console.error(error);
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

// GET detail tahun ajaran by ID + daftar kelas di salah satu semester
router.get('/:id/classes', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
  
      // Cari tahun ajaran beserta semester-semesternya
      const academicYear = await AcademicYear.findByPk(id, {
        include: [
          {
            model: Semester,
            attributes: ['id', 'name'],
            include: [
              {
                model: StudentClass,
                include: ['Class'] // pastikan model Class didefinisikan dan di-associate
              }
            ]
          }
        ]
      });
  
      if (!academicYear) {
        return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
      }
  
      // Ambil daftar kelas dari semester Ganjil (karena Genap diasumsikan sama)
      const ganjilSemester = academicYear.Semesters.find(s => s.name === 'Ganjil');
  
      if (!ganjilSemester) {
        return res.status(404).json({ message: 'Semester Ganjil tidak ditemukan di tahun ajaran ini' });
      }
  
      const classList = ganjilSemester.StudentClasses.map(sc => ({
        id: sc.Class?.id,
        name: sc.Class?.name
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
  
      // Cek tahun ajaran
      const academicYear = await AcademicYear.findByPk(id, {
        include: [Semester]
      });
      if (!academicYear) return res.status(404).json({ message: "Tahun ajaran tidak ditemukan" });
  
      // Cek dua semester
      const semesters = academicYear.Semesters;
      if (semesters.length !== 2) return res.status(400).json({ message: "Tahun ajaran harus memiliki dua semester" });
  
      // Buat kelas
      const newClass = await Class.create({ name, teacher_id });
  
      // Tambahkan kelas ke kedua semester
      await Promise.all(semesters.map(semester => {
        return StudentClass.create({
          semester_id: semester.id,
          class_id: newClass.id
        });
      }));
  
      res.status(201).json({ message: "Kelas berhasil ditambahkan ke tahun ajaran", class: newClass });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menambahkan kelas" });
    }
});  

// PUT /academic-years/:id/classes/:classId
router.put('/classes/:classId', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
      const { classId } = req.params;
      const { name, teacher_id } = req.body;
  
      const targetClass = await Class.findByPk(classId);
      if (!targetClass) return res.status(404).json({ message: "Kelas tidak ditemukan" });
  
      targetClass.name = name;
      targetClass.teacher_id = teacher_id;
      await targetClass.save();
  
      res.json({ message: "Nama kelas berhasil diperbarui", class: targetClass });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat mengedit nama kelas" });
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

router.post("/:academicYearId/classes/:classId/students", async (req, res) => {
    const { academicYearId, classId } = req.params;
    const { student_ids } = req.body;
  
    // Pastikan student_ids adalah array
    if (!Array.isArray(student_ids)) {
      return res.status(400).json({ message: "student_ids harus berupa array" });
    }
  
    try {
      // Cari semua semester pada tahun pelajaran ini
      const semesters = await Semester.findAll({
        where: { academic_year_id: academicYearId }
      });
  
      if (!semesters || semesters.length === 0) {
        return res.status(404).json({ message: "Semester tidak ditemukan" });
      }
  
      // Verifikasi bahwa semua student_ids ada di tabel students
      const students = await Student.findAll({
        where: {
          id: student_ids
        }
      });
  
      // Jika ada student_id yang tidak ditemukan
      if (students.length !== student_ids.length) {
        const foundStudentIds = students.map(student => student.id);
        const notFoundIds = student_ids.filter(id => !foundStudentIds.includes(id));
        return res.status(400).json({
          message: `Siswa dengan ID berikut tidak ditemukan: ${notFoundIds.join(", ")}`
        });
      }
  
      const studentClassEntries = [];
  
      // Untuk setiap semester, buat entri student_class jika belum ada
      for (const semester of semesters) {
        for (const studentId of student_ids) {
          // Periksa apakah sudah ada entri student_class dengan kombinasi student_id dan semester_id
          const existingEntry = await StudentClass.findOne({
            where: {
              student_id: studentId,
              semester_id: semester.id,
              class_id: classId,
            }
          });
  
          if (!existingEntry) {
            studentClassEntries.push({
              semester_id: semester.id,
              class_id: classId,
              student_id: studentId,
            });
          }
        }
      }
  
      // Jika ada entri baru yang akan ditambahkan
      if (studentClassEntries.length > 0) {
        await StudentClass.bulkCreate(studentClassEntries);
        res.status(201).json({
          message: "Siswa berhasil ditambahkan ke kelas di semua semester tahun pelajaran",
        });
      } else {
        res.status(400).json({
          message: "Tidak ada siswa yang perlu ditambahkan (mungkin sudah ada di kelas tersebut)."
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menambahkan siswa", error });
    }
  });
  
module.exports = router;