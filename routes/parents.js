const express      = require("express");
const asyncHandler = require("express-async-handler");
const NodeCache    = require("node-cache");
const { Op }       = require("sequelize");

const {
  AcademicYear, Semester, Student, StudentClass,
  Attendance, Schedule, Subject, Class,
  Evaluation, StudentEvaluation,
  GradeCategory, GradeDetail, StudentGrade
} = require("../models");

const router  = express.Router();
const cache   = new NodeCache({ stdTTL: 300 }); // 5-menit

/* ════════════════════════════════════════════════════════════════ */
/* 🔌  MIDDLEWARE : Muat konteks siswa + tahun ajaran aktif
/* ════════════════════════════════════════════════════════════════ */
const loadStudentCtx = asyncHandler(async (req, res, next) => {
  const parentId = req.user.id;
  const cacheKey = `ctx:${parentId}`;

  let ctx = cache.get(cacheKey);
  if (!ctx) {
    /* 1. Tahun ajaran aktif  */
    const activeYear = await AcademicYear.findOne({
      where: { is_active: true },
      attributes: ["id", "year"]
    });
    if (!activeYear) return res.status(404).json({ message: "Tahun ajaran aktif tidak ditemukan" });

    /* 2. Siswa  */
    const student = await Student.findOne({
      where: { parent_id: parentId },
      attributes: ["id", "name", "nisn", "birth_date"]
    });
    if (!student) return res.status(404).json({ message: "Data siswa tidak ditemukan" });

    /* 3. Kelas siswa pada tahun ajaran aktif  */
    const studentClass = await StudentClass.findOne({
      where: { student_id: student.id },
      include: {
        model : Class,
        as    : "class",
        where : { academic_year_id: activeYear.id },
        attributes: ["id", "name"]
      },
      attributes: ["id", "class_id"]
    });
    if (!studentClass) return res.status(404).json({ message: "Kelas siswa di tahun ajaran aktif tidak ditemukan" });

    ctx = { activeYear, student, studentClass };
    cache.set(cacheKey, ctx);
  }

  req.ctx = ctx;                // { activeYear, student, studentClass }
  next();
});

/* ════════════════════════════════════════════════════════════════ */
/*  1) PROFIL ANAK
/* ════════════════════════════════════════════════════════════════ */
router.get("/student", loadStudentCtx, (req, res) => {
  const { student, studentClass } = req.ctx;

  res.json({
    name       : student.name,
    nisn       : student.nisn,
    birth_date : student.birth_date,
    student_class: [{
      id   : studentClass.id,
      name : studentClass.class.name,
      teacher: null  // tambahkan jika relasi teacher ingin ditampilkan
    }]
  });
});

/* ════════════════════════════════════════════════════════════════ */
/*  2) JADWAL HARIAN
/* ════════════════════════════════════════════════════════════════ */
router.get("/schedule", loadStudentCtx, asyncHandler(async (req, res) => {
  const { class_id } = req.ctx.studentClass;
  const { day } = req.query;

  const schedules = await Schedule.findAll({
    where: { class_id, ...(day && { day }) },
    attributes: ["day", "start_time", "end_time"],
    include: {
      model: Subject,
      as: "subject",
      attributes: ["name"]
    },
    order: [["day", "ASC"], ["start_time", "ASC"]]
  });

  res.json(schedules);
}));

/* ════════════════════════════════════════════════════════════════ */
/*  3) KEHADIRAN
/* ════════════════════════════════════════════════════════════════ */
router.get("/attendances/:semesterId", loadStudentCtx, asyncHandler(async (req, res) => {
  const { semesterId } = req.params;
  const { studentClass } = req.ctx;

  /* validasi semester + tahun ajaran aktif (simple EXISTS check) */
  const exists = await Semester.count({
    where: { id: semesterId },
    include: { model: AcademicYear, as: "academic_year", where: { is_active: true } }
  });
  if (!exists) return res.status(404).json({ message: "Semester tidak valid / tidak aktif" });

  const attendances = await Attendance.findAll({
    where : { student_class_id: studentClass.id, semester_id: semesterId },
    order : [["date", "DESC"]],
    attributes: ["date", "status"]
  });

  if (attendances.length === 0)
    return res.status(404).json({ message: "Data kehadiran tidak ditemukan untuk semester ini" });

  const result = attendances.map(a => ({
    date   : a.date,
    day    : new Date(a.date).toLocaleString("id-ID", { weekday: "long" }),
    status : a.status
  }));

  res.json(result);
}));

/* ════════════════════════════════════════════════════════════════ */
/*  4) LIST & DETAIL EVALUASI
/* ════════════════════════════════════════════════════════════════ */
router.get("/evaluations/:semesterId", loadStudentCtx, asyncHandler(async (req, res) => {
  const { semesterId } = req.params;
  const { studentClass } = req.ctx;

  const evaluations = await Evaluation.findAll({
    where : { class_id: studentClass.class_id, semester_id: semesterId },
    attributes: ["id", "title"],
    include: { model: Semester, as: "semester", attributes: ["id", "name"] },
    order : [["title", "ASC"]]
  });
  if (!evaluations.length)
    return res.status(404).json({ message: "Belum ada evaluasi untuk semester ini" });

  res.json(evaluations.map(e => ({
    id            : e.id,
    title         : e.title,
    semester_id   : e.semester.id,
    semester_name : e.semester.name
  })));
}));

router.get("/evaluations/:semesterId/:evaluationId",
  loadStudentCtx,
  asyncHandler(async (req, res) => {
    const { evaluationId } = req.params;
    const { studentClass } = req.ctx;

    const studentEvaluation = await StudentEvaluation.findOne({
      where : { student_class_id: studentClass.id, evaluation_id: evaluationId },
      include: { model: Evaluation, as: "evaluation", attributes: ["id", "title"] }
    });
    if (!studentEvaluation)
      return res.status(404).json({ message: "Evaluasi tidak ditemukan untuk siswa pada semester ini" });

    res.json({
      id    : studentEvaluation.evaluation.id,
      title : studentEvaluation.evaluation.title,
      description: studentEvaluation.description
    });
}));

/* ════════════════════════════════════════════════════════════════ */
/*  5) MATA PELAJARAN
/* ════════════════════════════════════════════════════════════════ */
router.get("/grades/:semesterId/subjects", loadStudentCtx, asyncHandler(async (req, res) => {
  const { studentClass, activeYear } = req.ctx;

  // jadwal → ambil DISTINCT subject
  const schedules = await Schedule.findAll({
    where: { class_id: studentClass.class_id },
    include: { model: Subject, as: "subject", attributes: ["id", "name"] },
    attributes: [],
    group: ["subject.id", "subject.name"]   // DISTINCT
  });

  const subjects = schedules.map(s => ({
    id                     : s.subject.id,
    name                   : s.subject.name,
    semester_id            : req.params.semesterId,
    semester_name          : null,
    academic_year_id       : activeYear.id,
    academic_year_name     : activeYear.year,
    is_academic_year_active: true
  })).sort((a, b) => a.name.localeCompare(b.name));

  res.json(subjects);
}));

/* ════════════════════════════════════════════════════════════════ */
/*  6) KATEGORI NILAI  &  DETAIL
/* ════════════════════════════════════════════════════════════════ */
router.get("/grades/:semesterId/:subjectId/categories", loadStudentCtx, asyncHandler(async (req, res) => {
  const { semesterId, subjectId } = req.params;
  const { studentClass } = req.ctx;

  const gradeCategories = await GradeCategory.findAll({
    where : { subject_id: subjectId, semester_id: semesterId, class_id: studentClass.class_id },
    order : [["name", "ASC"]],
    attributes: ["id", "name"]
  });

  res.json(gradeCategories);
}));

router.get("/grades/categories/:gradeCategoryId/details", loadStudentCtx, asyncHandler(async (req, res) => {
  const { gradeCategoryId } = req.params;
  const { studentClass } = req.ctx;

  const gradeDetails = await GradeDetail.findAll({
    where : { grade_category_id: gradeCategoryId },
    include: {
      model: StudentGrade,
      as  : "student_grade",
      where: { student_class_id: studentClass.id },
      required: false,
      attributes: ["score"]
    },
    attributes: ["name", "date"],
    order: [["date", "DESC"]]
  });

  const result = gradeDetails.map(d => ({
    title : d.name,
    date  : d.date,
    day   : new Date(d.date).toLocaleString("id-ID", { weekday: "long" }),
    score : d.student_grade[0]?.score ?? null
  }));

  res.json(result);
}));

module.exports = router;
