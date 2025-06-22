const { Op } = require('sequelize');
const {
  AcademicYear, Semester, Class, Evaluation,
  StudentClass, StudentEvaluation, Student
} = require('../models');

// GET /semesters/:semester_id/evaluations
exports.listTitles = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: req.user.id, academic_year_id: activeYear.id } });
    if (!myClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    const evaluations = await Evaluation.findAll({
      where: { class_id: myClass.id, semester_id: req.params.semester_id },
      order: [['title', 'ASC']]
    });
    return res.json({ evaluations });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil evaluasi', error: e.message });
  }
};

// POST /semesters/:semester_id/evaluations
exports.createTitle = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Judul evaluasi harus diisi' });

    const semester = await Semester.findOne({
      where: { id: req.params.semester_id },
      include: { model: AcademicYear, as: 'academic_year', where: { is_active: true } }
    });
    if (!semester) return res.status(404).json({ message: 'Semester tidak ditemukan / tidak aktif' });

    const myClass = await Class.findOne({ where: { teacher_id: req.user.id, academic_year_id: semester.academic_year_id } });
    if (!myClass) return res.status(404).json({ message: 'Bukan wali kelas' });

    const exists = await Evaluation.findOne({
      where: { title: title.trim(), class_id: myClass.id, semester_id: semester.id }
    });
    if (exists) return res.status(400).json({ message: 'Evaluasi sudah ada' });

    const evaluation = await Evaluation.create({ title: title.trim(), class_id: myClass.id, semester_id: semester.id });

    const studentClasses = await StudentClass.findAll({ where: { class_id: myClass.id }, attributes: ['id'] });
    await StudentEvaluation.bulkCreate(
      studentClasses.map(sc => ({ evaluation_id: evaluation.id, student_class_id: sc.id, description: null }))
    );

    return res.status(201).json({ message: 'Evaluasi ditambahkan', evaluation });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menambah evaluasi', error: e.message });
  }
};

// PUT /evaluations/:id
exports.updateTitle = async (req, res) => {
  try {
    const { title } = req.body;
    const evaluation = await Evaluation.findByPk(req.params.id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });

    const semester = await Semester.findByPk(evaluation.semester_id);
    const activeYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: req.user.id, academic_year_id: activeYear.id } });
    if (!myClass || myClass.id !== evaluation.class_id)
      return res.status(403).json({ message: 'Tidak berhak edit' });

    const duplicate = await Evaluation.findOne({
      where: { title: title.trim(), class_id: myClass.id, semester_id: evaluation.semester_id, id: { [Op.ne]: evaluation.id } }
    });
    if (duplicate) return res.status(400).json({ message: 'Judul evaluasi sudah digunakan' });

    evaluation.title = title.trim();
    await evaluation.save();
    return res.json({ message: 'Evaluasi diperbarui', evaluation });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal memperbarui', error: e.message });
  }
};

// DELETE /evaluations/:id
exports.deleteTitle = async (req, res) => {
  try {
    await Evaluation.destroy({ where: { id: req.params.id } });
    return res.json({ message: 'Evaluasi berhasil dihapus' });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menghapus', error: e.message });
  }
};

// GET /evaluations/:id (student list)
exports.listStudentEvaluations = async (req, res) => {
  try {
    const evaluation = await Evaluation.findByPk(req.params.id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });

    const semester = await Semester.findByPk(evaluation.semester_id);
    const activeYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: req.user.id, academic_year_id: activeYear.id } });
    if (!myClass || myClass.id !== evaluation.class_id)
      return res.status(403).json({ message: 'Tidak berhak melihat evaluasi' });

    const studentEvaluations = await StudentEvaluation.findAll({
      where: { evaluation_id: evaluation.id },
      include: {
        model: StudentClass,
        as: 'student_class',
        include: { model: Student, as: 'student', attributes: ['name', 'nisn'] }
      }
    });

    const result = studentEvaluations
      .map(se => ({
        student_evaluation_id: se.id,
        name: se.student_class?.student?.name,
        nisn: se.student_class?.student?.nisn,
        description: se.description
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ message: 'Gagal', error: e.message });
  }
};

// PUT /student-evaluations/:id
exports.updateDescription = async (req, res) => {
  try {
    const { description } = req.body;
    const se = await StudentEvaluation.findByPk(req.params.id, {
      include: { model: Evaluation, as: 'evaluation' }
    });
    if (!se) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const semester = await require('../models').Semester.findByPk(se.evaluation.semester_id);
    const activeYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: req.user.id, academic_year_id: activeYear.id } });
    if (!myClass || myClass.id !== se.evaluation.class_id) return res.status(403).json({ message: 'Tidak berhak' });

    se.description = description;
    await se.save();
    return res.json({ message: 'Deskripsi diperbarui' });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal', error: e.message });
  }
};
