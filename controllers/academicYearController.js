const { AcademicYear, Semester, Class, StudentClass, Student } = require('../models');
const { Op } = require('sequelize');

// GET semua tahun ajaran dengan semester aktif
exports.getAllAcademicYears = async (req, res) => {
  try {
    const academicYears = await AcademicYear.findAll({
      include: [{ model: Semester, as: 'semester', attributes: ['id', 'name', 'is_active'] }],
      order: [['year', 'DESC']]
    });
    res.json(academicYears);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Tambah Tahun Ajaran Baru
exports.createAcademicYear = async (req, res) => {
  try {
    const { year, is_active = false } = req.body;

    const existingAcademicYear = await AcademicYear.findOne({ where: { year } });
    if (existingAcademicYear) {
      return res.status(400).json({ message: 'Tahun ajaran sudah ada.' });
    }

    if (is_active) {
      const activeAcademicYears = await AcademicYear.findAll({ where: { is_active: true } });
      for (const ay of activeAcademicYears) {
        await ay.update({ is_active: false });
        await Semester.update({ is_active: false }, { where: { academic_year_id: ay.id } });
      }
    }

    const newAcademicYear = await AcademicYear.create({ year, is_active });

    if (!is_active) {
      await Semester.update({ is_active: false }, { where: { academic_year_id: newAcademicYear.id } });
    }

    res.status(201).json({
      message: `Tahun ajaran berhasil ditambahkan${is_active ? ' dan diaktifkan' : ''}.`,
      data: newAcademicYear
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// PUT - Update Tahun Ajaran
exports.updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, is_active } = req.body;

    const academicYear = await AcademicYear.findByPk(id, {
      include: [{ model: Semester, as: 'semester' }]
    });

    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    if (typeof is_active !== 'undefined' && is_active) {
      await AcademicYear.update({ is_active: false }, { where: {} });
    }

    if (typeof year !== 'undefined' && academicYear.year !== year) {
      const existing = await AcademicYear.findOne({ where: { year } });
      if (existing && existing.id !== parseInt(id)) {
        return res.status(400).json({ message: `Tahun ajaran '${year}' sudah ada.` });
      }
      academicYear.year = year;
    }

    if (typeof is_active !== 'undefined') {
      academicYear.is_active = is_active;
    }

    await academicYear.save();

    if (typeof is_active !== 'undefined' && !is_active) {
      await Semester.update({ is_active: false }, { where: { academic_year_id: id } });
    }

    res.json({ message: 'Tahun ajaran berhasil diperbarui' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// DELETE - Hapus Tahun Ajaran
exports.deleteAcademicYear = async (req, res) => {
  try {
    await AcademicYear.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted Successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT - Update status semester dalam tahun ajaran aktif
exports.activateSemester = async (req, res) => {
  try {
    const { is_active } = req.body;
    const semesterToUpdate = await Semester.findByPk(req.params.id);

    if (!semesterToUpdate) {
      return res.status(404).json({ message: 'Semester tidak ditemukan' });
    }

    const academicYear = await AcademicYear.findByPk(semesterToUpdate.academic_year_id);
    if (!academicYear || !academicYear.is_active) {
      return res.status(400).json({ message: 'Semester ini tidak berasal dari tahun ajaran aktif' });
    }

    if (is_active) {
      await Semester.update({ is_active: false }, {
        where: { academic_year_id: academicYear.id }
      });
    }

    semesterToUpdate.is_active = is_active;
    await semesterToUpdate.save();

    res.json({ message: `Semester berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Daftar kelas pada tahun ajaran
exports.getClassesByAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findByPk(req.params.id, {
      include: [{ model: Class, as: 'class', attributes: ['id', 'name'] }]
    });

    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const classList = academicYear.class.map(cls => ({
      id: cls.id,
      name: cls.name,
      grade_level: parseInt(cls.name.charAt(0)) || null
    }));

    res.json({
      id: academicYear.id,
      year: academicYear.year,
      is_active: academicYear.is_active,
      classes: classList
    });

  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// POST - Buat kelas baru
exports.createClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, teacher_id } = req.body;

    const academicYear = await AcademicYear.findByPk(id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const existingClass = await Class.findOne({ where: { name, academic_year_id: id } });
    if (existingClass) {
      return res.status(400).json({ message: 'Kelas dengan nama yang sama sudah ada di tahun ajaran ini' });
    }

    const newClass = await Class.create({ name, teacher_id, academic_year_id: id });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// PUT - Update kelas
exports.updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, teacher_id } = req.body;

    const existingClass = await Class.findByPk(classId);
    if (!existingClass) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (teacher_id) updateFields.teacher_id = teacher_id;

    if (Object.keys(updateFields).length > 0) {
      await existingClass.update(updateFields);
    }

    res.json({ message: 'Kelas berhasil diperbarui', data: existingClass });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// DELETE - Hapus kelas
exports.deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const existingClass = await Class.findByPk(classId);
    if (!existingClass) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }

    await existingClass.destroy();
    res.json({ message: 'Kelas berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// GET - Daftar siswa di kelas tertentu
exports.getStudentsByClass = async (req, res) => {
  try {
    const { academicYearId, classId } = req.params;

    const classData = await Class.findOne({
      where: { id: classId, academic_year_id: academicYearId },
      include: [{
        model: StudentClass,
        as: 'student_class',
        include: [{
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'nisn', 'birth_date', 'parent_id']
        }]
      }]
    });

    if (!classData) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran ini' });
    }

    const students = classData.student_class ? classData.student_class.map(sc => sc.student) : [];

    res.json({
      class_id: classData.id,
      class_name: classData.name,
      students
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// POST - Tambahkan siswa ke kelas
exports.addStudentsToClass = async (req, res) => {
  try {
    const { academicYearId, classId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Harap sertakan ID siswa yang valid dalam format array.' });
    }

    const students = await Student.findAll({ where: { id: studentIds } });
    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Beberapa siswa tidak ditemukan' });
    }

    const classesInYear = await Class.findAll({
      where: { academic_year_id: academicYearId },
      attributes: ['id']
    });
    const classIdsInYear = classesInYear.map(c => c.id);

    const existingStudentAssignments = await StudentClass.findAll({
      where: { student_id: studentIds, class_id: classIdsInYear }
    });

    if (existingStudentAssignments.length > 0) {
      const alreadyAssignedIds = existingStudentAssignments.map(entry => entry.student_id);
      return res.status(400).json({
        message: 'Beberapa siswa sudah terdaftar di kelas lain dalam tahun ajaran ini.',
        student_ids: alreadyAssignedIds
      });
    }

    const studentClasses = studentIds.map(studentId => ({
      student_id: studentId,
      class_id: classId
    }));

    await StudentClass.bulkCreate(studentClasses);
    res.status(201).json({ message: 'Siswa berhasil ditambahkan ke kelas.' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// DELETE - Hapus siswa dari kelas
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { academicYearId, classId, studentId } = req.params;

    const studentClass = await StudentClass.findOne({
      where: {
        student_id: studentId,
        class_id: classId
      }
    });

    if (!studentClass) {
      return res.status(404).json({ message: 'Siswa tidak terdaftar dalam kelas ini' });
    }

    await studentClass.destroy();
    res.status(200).json({ message: 'Siswa berhasil dihapus dari kelas' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};
