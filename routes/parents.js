// routes/parentRouter.js
const express = require('express');
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const {
  User, AcademicYear, Semester, Student, StudentClass, Attendance,
  Schedule, Subject, Class, Evaluation, StudentEvaluation,
  GradeCategory, GradeDetail, StudentGrade
} = require('../models');

const router = express.Router();

/* ────────────────────────────────  HELPERS  ──────────────────────────────── */

const loadActiveContext = async (parentId) => {
  // Satu query untuk ambil siswa + kelas + tahun ajaran aktif
  return Student.findOne({
    where: { parent_id: parentId },
    attributes: ['id', 'name', 'nisn', 'birth_date'],
    raw: true,
    nest: true,
    include: [{
      model: StudentClass,
      as: 'student_class',
      attributes: ['id', 'class_id'],
      required: true,
      include: [{
        model: Class,
        as: 'class',
        attributes: ['id', 'name', 'academic_year_id'],
        required: true,
        include: [{
          model: AcademicYear,
          as: 'academic_year',
          where: { is_active: true },
          attributes: ['id', 'year', 'is_active'],
          required: true
        }]
      }]
    }]
  });
};

// optional Redis-aware cache wrapper
const cache = (ttl) => async (req, res, next) => {
  const redis = req.app?.locals?.redis;
  if (!redis) return next();

  const key = `p:${req.user.id}:${req.originalUrl}`;
  const hit = await redis.get(key);
  if (hit) return res.json(JSON.parse(hit));

  res._json = res.json;
  res.json = (body) => {
    redis.setex(key, ttl, JSON.stringify(body));
    res._json(body);
  };
  next();
};

/* ────────────────────────────────  ENDPOINTS  ────────────────────────────── */

// 1. Profil Anak
router.get('/student', asyncHandler(async (req, res) => {
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx || !ctx.student_class?.class?.name) {
    return res.status(404).json({ message: 'Data anak tidak ditemukan atau kelas tidak aktif' });
  }

  res.json({
    name        : ctx.name,
    nisn        : ctx.nisn,
    birth_date  : ctx.birth_date,
    student_class: [{
      id   : ctx.student_class.id,
      class: {
        name: ctx.student_class.class.name
      },
      teacher: undefined // dipertahankan kosong karena tidak di-join di sini
    }]
  });
}));

// 2. Jadwal mapel (opsional filter ?day=Senin)
router.get('/schedule', cache(30), asyncHandler(async (req, res) => {
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx) return res.status(404).json({ message: 'Data anak/kelas tidak ada' });

  const where = { class_id: ctx.student_class.class_id };
  if (req.query.day) where.day = { [Op.eq]: req.query.day };

  const schedules = await Schedule.findAll({
    where,
    raw: true,
    nest: true,
    attributes: ['day', 'start_time', 'end_time'],
    include: [{ model: Subject, as: 'subject', attributes: ['name'], required: true }],
    order: [['day', 'ASC'], ['start_time', 'ASC']]
  });

  res.json(schedules);
}));

// 3. Kehadiran per-semester
router.get('/attendances/:semesterId', asyncHandler(async (req, res) => {
  const { semesterId } = req.params;
  const parentId = req.user.id;

  const [semester, ctx] = await Promise.all([
    Semester.findOne({
      where: { id: semesterId },
      include: { model: AcademicYear, as: 'academic_year', where: { is_active: true }, attributes: [] },
      raw: true
    }),
    loadActiveContext(parentId)
  ]);

  if (!semester) return res.status(404).json({ message: 'Semester tidak aktif' });
  if (!ctx)      return res.status(404).json({ message: 'Data anak tidak ditemukan' });

  // pastikan kelas siswa berada di tahun ajaran semester tsb
  if (ctx.student_class.class.academic_year_id !== semester.academic_year_id) {
    return res.status(404).json({ message: 'Kelas siswa tidak sesuai semester' });
  }

  const attendances = await Attendance.findAll({
    where: { student_class_id: ctx.student_class.id, semester_id: semesterId },
    raw: true,
    order: [['date', 'DESC']]
  });
  if (attendances.length === 0) {
    return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
  }

  const result = attendances.map(a => ({
    date  : a.date,
    day   : new Date(a.date).toLocaleString('id-ID', { weekday: 'long' }),
    status: a.status
  }));

  res.json(result);
}));

// 4. Daftar evaluasi per-semester
router.get('/evaluations/:semesterId', cache(30), asyncHandler(async (req, res) => {
  const { semesterId } = req.params;
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

  const semester = await Semester.findOne({
    where: { id: semesterId, academic_year_id: ctx.student_class.class.academic_year_id },
    raw: true
  });
  if (!semester) return res.status(404).json({ message: 'Semester tidak aktif' });

  const evaluations = await Evaluation.findAll({
    where: { class_id: ctx.student_class.class_id, semester_id: semesterId },
    raw: true,
    order: [['title', 'ASC']],
    attributes: ['id', 'title', 'semester_id']
  });
  if (!evaluations.length) {
    return res.status(404).json({ message: 'Belum ada evaluasi' });
  }

  res.json(
    evaluations.map(e => ({
      id           : e.id,
      title        : e.title,
      semester_id  : e.semester_id,
      semester_name: semester.name
    }))
  );
}));

// 5. Detail evaluasi
router.get('/evaluations/:semesterId/:evaluationId', asyncHandler(async (req, res) => {
  const { semesterId, evaluationId } = req.params;
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

  // validasi semester
  const semester = await Semester.count({
    where: { id: semesterId, academic_year_id: ctx.student_class.class.academic_year_id }
  });
  if (!semester) return res.status(404).json({ message: 'Semester tidak aktif' });

  const studentEvaluation = await StudentEvaluation.findOne({
    raw: true,
    nest: true,
    where: { student_class_id: ctx.student_class.id, evaluation_id: evaluationId },
    include: {
      model: Evaluation,
      as: 'evaluation',
      where: { semester_id: semesterId },
      attributes: ['id', 'title'],
      required: true
    }
  });
  if (!studentEvaluation) {
    return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
  }

  res.json({
    id         : studentEvaluation.evaluation.id,
    title      : studentEvaluation.evaluation.title,
    description: studentEvaluation.description
  });
}));

// 6. Daftar mapel (unik) suatu semester
router.get('/grades/:semesterId/subjects', cache(30), asyncHandler(async (req, res) => {
  const { semesterId } = req.params;
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

  const semester = await Semester.findOne({
    where: { id: semesterId, academic_year_id: ctx.student_class.class.academic_year_id },
    raw: true,
    nest: true,
    include: { model: AcademicYear, as: 'academic_year', attributes: ['year', 'is_active'] }
  });
  if (!semester) return res.status(404).json({ message: 'Semester tidak aktif' });

  const schedules = await Schedule.findAll({
    where: { class_id: ctx.student_class.class_id },
    raw: true,
    nest: true,
    attributes: [],
    include: { model: Subject, as: 'subject', attributes: ['id', 'name'], required: true }
  });

  const unique = {};
  schedules.forEach(s => unique[s.subject.id] = {
    id                    : s.subject.id,
    name                  : s.subject.name,
    semester_id           : semester.id,
    semester_name         : semester.name,
    academic_year_id      : semester.academic_year_id,
    academic_year_name    : semester.academic_year.year,
    is_academic_year_active: semester.academic_year.is_active
  });

  const subjects = Object.values(unique).sort((a, b) => a.name.localeCompare(b.name));
  res.json(subjects);
}));

// 7. Daftar kategori nilai mapel
router.get('/grades/:semesterId/:subjectId/categories', cache(30), asyncHandler(async (req, res) => {
  const { semesterId, subjectId } = req.params;
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

  // validasi semester
  const semester = await Semester.count({
    where: { id: semesterId, academic_year_id: ctx.student_class.class.academic_year_id }
  });
  if (!semester) return res.status(404).json({ message: 'Semester tidak aktif' });

  const categories = await GradeCategory.findAll({
    where: { subject_id: subjectId, semester_id: semesterId, class_id: ctx.student_class.class_id },
    raw: true,
    attributes: ['id', 'name'],
    order: [['name', 'ASC']]
  });

  res.json(categories);
}));

// 8. Detail nilai kategori
router.get('/grades/categories/:gradeCategoryId/details', cache(30), asyncHandler(async (req, res) => {
  const { gradeCategoryId } = req.params;
  const ctx = await loadActiveContext(req.user.id);
  if (!ctx) return res.status(404).json({ message: 'Data anak tidak ditemukan' });

  const gradeCategory = await GradeCategory.findByPk(gradeCategoryId, { raw: true });
  if (!gradeCategory) return res.status(404).json({ message: 'Kategori nilai tidak ditemukan' });
  if (gradeCategory.class_id !== ctx.student_class.class_id) {
    return res.status(404).json({ message: 'Kategori tidak sesuai kelas siswa' });
  }

  const details = await GradeDetail.findAll({
    where: { grade_category_id: gradeCategoryId },
    raw: true,
    nest: true,
    include: {
      model: StudentGrade,
      as: 'student_grade',
      where: { student_class_id: ctx.student_class.id },
      required: false
    }
  });

  const result = details.map(d => ({
    title: d.name,
    date : d.date,
    day  : new Date(d.date).toLocaleString('id-ID', { weekday: 'long' }),
    score: d.student_grade?.score ?? null
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(result);
}));

module.exports = router;
