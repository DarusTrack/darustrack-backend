const { Op } = require('sequelize');
const {
  AcademicYear, Class, Schedule, Subject,
  GradeCategory, GradeDetail, StudentClass,
  StudentGrade
} = require('../models');

// GET /grades/subjects
exports.listSubjects = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id, academic_year_id: activeYear.id } });
    if (!teacherClass) return res.status(403).json({ message: 'Tidak ada kelas' });

    const seen = new Set();
    const subjects = (await Schedule.findAll({
      where: { class_id: teacherClass.id },
      include: { model: Subject, as: 'subject', attributes: ['id', 'name'] },
      attributes: ['subject_id'], raw: true, nest: true
    }))
      .filter(s => !seen.has(s.subject.id) && seen.add(s.subject.id))
      .map(s => ({ subject_id: s.subject.id, subject_name: s.subject.name }))
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name));

    return res.json(subjects);
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// helper
const getTeacherClass = (userId) => Class.findOne({ where: { teacher_id: userId }, attributes: ['id'] });

// GET /grades/:subject_id/:semester_id/categories
exports.listCategories = async (req, res) => {
  try {
    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass) return res.status(403).json({ message: 'Akses ditolak' });

    const cats = await GradeCategory.findAll({
      where: { class_id: teacherClass.id, subject_id: req.params.subject_id, semester_id: req.params.semester_id },
      attributes: ['id', 'name']
    });
    return res.json(cats);
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// POST /grades/:subject_id/:semester_id/categories
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass) return res.status(403).json({ message: 'Akses ditolak' });

    const exists = await GradeCategory.findOne({
      where: { name, class_id: teacherClass.id, subject_id: req.params.subject_id, semester_id: req.params.semester_id }
    });
    if (exists) return res.status(400).json({ message: 'Kategori sudah ada' });

    const newCat = await GradeCategory.create({
      name, class_id: teacherClass.id, subject_id: req.params.subject_id, semester_id: req.params.semester_id
    });
    return res.status(201).json(newCat);
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// PUT /grades/categories/:category_id
exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await GradeCategory.findByPk(req.params.category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    const duplicate = await GradeCategory.findOne({
      where: { name, class_id: teacherClass.id, subject_id: category.subject_id, id: { [Op.ne]: category.id } }
    });
    if (duplicate) return res.status(400).json({ message: 'Nama sudah digunakan' });

    category.name = name;
    await category.save();
    return res.json({ message: 'Kategori diperbarui' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// DELETE /grades/categories/:category_id
exports.deleteCategory = async (req, res) => {
  try {
    const category = await GradeCategory.findByPk(req.params.category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    await GradeDetail.destroy({ where: { grade_category_id: category.id } });
    await category.destroy();
    return res.json({ message: 'Kategori dihapus' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// GET /grades/categories/:category_id/details
exports.listDetails = async (req, res) => {
  try {
    const category = await GradeCategory.findByPk(req.params.category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    const details = await GradeDetail.findAll({
      where: { grade_category_id: category.id },
      order: [['name', 'ASC']]
    });
    return res.json(details);
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// POST /grades/categories/:category_id/details
exports.createDetail = async (req, res) => {
  try {
    const { name, date } = req.body;
    const category = await GradeCategory.findByPk(req.params.category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    const exists = await GradeDetail.findOne({ where: { grade_category_id: category.id, name } });
    if (exists) return res.status(400).json({ message: 'Detail sudah ada' });

    const detail = await GradeDetail.create({ grade_category_id: category.id, name, date });

    const studentClasses = await StudentClass.findAll({ where: { class_id: teacherClass.id }, attributes: ['id'] });
    await StudentGrade.bulkCreate(studentClasses.map(sc => ({ student_class_id: sc.id, grade_detail_id: detail.id })));

    return res.status(201).json({ message: 'Detail ditambahkan', detail });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// PUT /grades/details/:detail_id
exports.updateDetail = async (req, res) => {
  try {
    const { name, date } = req.body;
    const detail = await GradeDetail.findByPk(req.params.detail_id, {
      include: { model: GradeCategory, as: 'grade_category' }
    });
    if (!detail) return res.status(404).json({ message: 'Detail tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== detail.grade_category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    if (name && name !== detail.name) {
      const dup = await GradeDetail.findOne({
        where: { grade_category_id: detail.grade_category_id, name, id: { [Op.ne]: detail.id } }
      });
      if (dup) return res.status(400).json({ message: 'Nama detail sudah dipakai' });
    }

    await detail.update({ name: name || detail.name, date: date || detail.date });
    return res.json({ message: 'Detail diperbarui' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// DELETE /grades/details/:detail_id
exports.deleteDetail = async (req, res) => {
  try {
    const detail = await GradeDetail.findByPk(req.params.detail_id, {
      include: { model: GradeCategory, as: 'grade_category' }
    });
    if (!detail) return res.status(404).json({ message: 'Detail tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== detail.grade_category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    await StudentGrade.destroy({ where: { grade_detail_id: detail.id } });
    await detail.destroy();
    return res.json({ message: 'Detail dihapus' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// GET /grades/details/:detail_id/students
exports.listStudentsForDetail = async (req, res) => {
  try {
    const detail = await GradeDetail.findByPk(req.params.detail_id, {
      include: { model: GradeCategory, as: 'grade_category', include: { model: Class, as: 'class' } }
    });
    if (!detail) return res.status(404).json({ message: 'Detail tidak ditemukan' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== detail.grade_category.class.id) return res.status(403).json({ message: 'Akses ditolak' });

    const studentGrades = await StudentGrade.findAll({
      where: { grade_detail_id: detail.id },
      include: {
        model: StudentClass,
        as: 'student_class',
        include: { model: require('../models').Student, as: 'student', attributes: ['id', 'name'] }
      },
      order: [[{ model: StudentClass, as: 'student_class' }, { model: require('../models').Student, as: 'student' }, 'name', 'ASC']]
    });

    return res.json(
      studentGrades.map(g => ({
        student_grade_id: g.id,
        student_id: g.student_class.student.id,
        student_name: g.student_class.student.name,
        score: g.score
      }))
    );
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};

// PATCH /grades/students/:student_grade_id
exports.updateStudentGrade = async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined || isNaN(score)) return res.status(400).json({ message: 'Invalid score' });

    const sg = await StudentGrade.findByPk(req.params.student_grade_id, {
      include: [
        {
          model: GradeDetail,
          as: 'grade_detail',
          include: { model: GradeCategory, as: 'grade_category', include: { model: Class, as: 'class' } }
        }
      ]
    });
    if (!sg) return res.status(404).json({ message: 'Student grade not found' });

    const teacherClass = await getTeacherClass(req.user.id);
    if (!teacherClass || teacherClass.id !== sg.grade_detail.grade_category.class.id) return res.status(403).json({ message: 'Akses ditolak' });

    sg.score = score;
    await sg.save();
    return res.json({ message: 'Score updated' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
};
