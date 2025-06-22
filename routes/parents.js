const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Validator = require('fastest-validator');
const { 
  User, AcademicYear, Semester, Student, StudentClass, 
  Attendance, Schedule, Subject, Class, Evaluation,
  StudentEvaluation, GradeCategory, GradeDetail, StudentGrade 
} = require('../models');
const v = new Validator();
const { createClient } = require('redis');

// Initialize Redis client
let redisClient;
(async () => {
  redisClient = createClient({url: process.env.REDIS_URL});
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect();
})();

// Cache middleware
const cache = (key, ttl = 3600) => async (req, res, next) => {
  try {
    if (!redisClient) {
      return next();
    }
    const cachedData = await redisClient.get(key);
    if (cachedData) return res.json(JSON.parse(cachedData));
    req.cacheKey = key;
    req.cacheTTL = ttl;
    next();
  } catch (err) {
    console.error('Redis error:', err);
    next();
  }
};

// Central error handler
const handleError = (res, error, defaultMessage = 'Server error') => {
  console.error(error);
  res.status(500).json({ 
    message: defaultMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Profile Anak (Optimized with caching and lean query)
router.get('/student', cache('student_profile'), async (req, res) => {
  try {
    const parentId = req.user.id;

    const student = await Student.findOne({
      where: { parent_id: parentId },
      attributes: ['id', 'name', 'nisn', 'birth_date'],
      include: [{
        model: StudentClass,
        as: 'student_class',
        attributes: ['id'],
        include: [{
          model: Class,
          as: 'class',
          attributes: ['id', 'name'],
          include: [{
            model: User,
            as: 'teacher',
            attributes: ['name']
          }]
        }],
        where: {
          '$class.academic_year.is_active$': true
        },
        required: true
      }]
    });

    if (!student) {
      return res.status(404).json({ message: 'Data anak tidak ditemukan' });
    }

    const result = {
      name: student.name,
      nisn: student.nisn,
      birth_date: student.birth_date,
      student_class: student.student_class.map(sc => ({
        id: sc.id,
        class: {
          id: sc.class.id,
          name: sc.class.name,
          teacher: sc.class.teacher
        }
      }))
    };

    if (req.cacheKey && redisClient) {
      await redisClient.setEx(req.cacheKey, req.cacheTTL, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data profil anak');
  }
});

// Jadwal Kelas Anak (Optimized with raw query and caching)
router.get('/schedule', cache('class_schedule'), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { day } = req.query;

    // First get active class for the student
    const student = await Student.findOne({
      where: { parent_id: parentId },
      attributes: ['id'],
      include: [{
        model: StudentClass,
        as: 'student_class',
        attributes: ['class_id'],
        include: [{
          model: Class,
          as: 'class',
          attributes: ['id'],
          where: {
            '$academic_year.is_active$': true
          }
        }]
      }]
    });

    if (!student || !student.student_class?.length) {
      return res.status(404).json({ message: 'Data kelas tidak ditemukan' });
    }

    const classId = student.student_class[0].class.id;

    // Use raw query for better performance
    const schedules = await Schedule.findAll({
      where: {
        class_id: classId,
        ...(day && { day })
      },
      attributes: ['day', 'start_time', 'end_time'],
      include: [{
        model: Subject,
        as: 'subject',
        attributes: ['name']
      }],
      order: [
        ['day', 'ASC'],
        ['start_time', 'ASC']
      ],
      raw: true,  // Get plain objects instead of model instances
      nest: true   // Nest the included models
    });

    const result = schedules.map(s => ({
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      subject: {
        name: s.subject.name
      }
    }));

    if (req.cacheKey) {
      await setExAsync(req.cacheKey, req.cacheTTL, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, 'Gagal mengambil jadwal kelas');
  }
});

// Kehadiran Anak (Optimized with pagination)
router.get('/attendances/:semesterId', async (req, res) => {
  try {
    const { semesterId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Validate semester and get student class in one query
    const studentClass = await StudentClass.findOne({
      where: {
        '$student.parent_id$': req.user.id,
        '$class.academic_year_id$': { 
          '$semester.academic_year_id$': semesterId 
        }
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: []
        },
        {
          model: Class,
          as: 'class',
          attributes: [],
          include: [{
            model: AcademicYear,
            as: 'academic_year',
            attributes: [],
            include: [{
              model: Semester,
              as: 'semesters',
              where: { id: semesterId },
              attributes: []
            }]
          }]
        }
      ],
      attributes: ['id']
    });

    if (!studentClass) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where: {
        student_class_id: studentClass.id,
        semester_id: semesterId
      },
      attributes: ['date', 'status'],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedAttendances = rows.map(attendance => ({
      date: attendance.date,
      day: new Date(attendance.date).toLocaleString('id-ID', { weekday: 'long' }),
      status: attendance.status
    }));

    res.json({
      data: formattedAttendances,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data kehadiran');
  }
});

// Evaluasi Anak (Optimized with single query)
router.get('/evaluations/:semesterId', async (req, res) => {
  try {
    const { semesterId } = req.params;

    const evaluations = await Evaluation.findAll({
      where: {
        semester_id: semesterId,
        '$class.student_classes.student.parent_id$': req.user.id,
        '$semester.academic_year.is_active$': true
      },
      include: [
        {
          model: Semester,
          as: 'semester',
          attributes: ['id', 'name'],
          include: [{
            model: AcademicYear,
            as: 'academic_year',
            attributes: []
          }]
        },
        {
          model: Class,
          as: 'class',
          attributes: [],
          include: [{
            model: StudentClass,
            as: 'student_classes',
            attributes: [],
            include: [{
              model: Student,
              as: 'student',
              attributes: []
            }]
          }]
        }
      ],
      attributes: ['id', 'title'],
      order: [['title', 'ASC']]
    });

    if (!evaluations.length) {
      return res.status(404).json({ message: 'Tidak ada evaluasi' });
    }

    res.json(evaluations.map(e => ({
      id: e.id,
      title: e.title,
      semester_id: e.semester.id,
      semester_name: e.semester.name
    })));
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data evaluasi');
  }
});

// Detail Evaluasi (Optimized with single query)
router.get('/evaluations/:semesterId/:evaluationId', async (req, res) => {
  try {
    const { semesterId, evaluationId } = req.params;

    const evaluation = await StudentEvaluation.findOne({
      where: {
        evaluation_id: evaluationId,
        '$student_class.student.parent_id$': req.user.id,
        '$evaluation.semester_id$': semesterId,
        '$evaluation.semester.academic_year.is_active$': true
      },
      include: [
        {
          model: Evaluation,
          as: 'evaluation',
          attributes: ['id', 'title'],
          include: [{
            model: Semester,
            as: 'semester',
            attributes: [],
            include: [{
              model: AcademicYear,
              as: 'academic_year',
              attributes: []
            }]
          }]
        },
        {
          model: StudentClass,
          as: 'student_class',
          attributes: [],
          include: [{
            model: Student,
            as: 'student',
            attributes: []
          }]
        }
      ],
      attributes: ['description']
    });

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
    }

    res.json({
      id: evaluation.evaluation.id,
      title: evaluation.evaluation.title,
      description: evaluation.description
    });
  } catch (error) {
    handleError(res, error, 'Gagal mengambil detail evaluasi');
  }
});

// Mata Pelajaran Anak (Optimized with caching)
router.get('/grades/:semesterId/subjects', cache('student_subjects'), async (req, res) => {
  try {
    const { semesterId } = req.params;

    const subjects = await Subject.findAll({
      attributes: ['id', 'name'],
      include: [{
        model: Schedule,
        as: 'schedules',
        attributes: [],
        where: {
          '$class.student_classes.student.parent_id$': req.user.id,
          '$class.academic_year.semesters.id$': semesterId
        },
        include: [
          {
            model: Class,
            as: 'class',
            attributes: [],
            include: [
              {
                model: StudentClass,
                as: 'student_classes',
                attributes: [],
                include: [{
                  model: Student,
                  as: 'student',
                  attributes: []
                }]
              },
              {
                model: AcademicYear,
                as: 'academic_year',
                attributes: [],
                include: [{
                  model: Semester,
                  as: 'semesters',
                  attributes: []
                }]
              }
            ]
          }
        ]
      }],
      group: ['Subject.id'],
      order: [['name', 'ASC']],
      raw: true
    });

    if (!subjects.length) {
      return res.status(404).json({ message: 'Tidak ada mata pelajaran' });
    }

    const result = subjects.map(s => ({
      id: s.id,
      name: s.name,
      semester_id: semesterId
    }));

    if (req.cacheKey) {
      await setExAsync(req.cacheKey, req.cacheTTL, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, 'Gagal mengambil mata pelajaran');
  }
});

// Kategori Nilai (Optimized with caching)
router.get('/grades/:semesterId/:subjectId/categories', 
  cache('grade_categories'), 
  async (req, res) => {
    try {
      const { semesterId, subjectId } = req.params;

      const categories = await GradeCategory.findAll({
        where: {
          subject_id: subjectId,
          semester_id: semesterId,
          '$class.student_classes.student.parent_id$': req.user.id
        },
        include: [{
          model: Class,
          as: 'class',
          attributes: [],
          include: [{
            model: StudentClass,
            as: 'student_classes',
            attributes: [],
            include: [{
              model: Student,
              as: 'student',
              attributes: []
            }]
          }]
        }],
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      });

      if (!categories.length) {
        return res.status(404).json({ message: 'Tidak ada kategori nilai' });
      }

      if (req.cacheKey) {
        await setExAsync(req.cacheKey, req.cacheTTL, JSON.stringify(categories));
      }

      res.json(categories);
    } catch (error) {
      handleError(res, error, 'Gagal mengambil kategori nilai');
    }
  }
);

// Detail Nilai (Optimized with single query)
router.get('/grades/categories/:gradeCategoryId/details', async (req, res) => {
  try {
    const { gradeCategoryId } = req.params;

    const details = await GradeDetail.findAll({
      where: { grade_category_id: gradeCategoryId },
      attributes: ['name', 'date'],
      include: [{
        model: StudentGrade,
        as: 'student_grade',
        attributes: ['score'],
        required: false,
        where: {
          '$student_class.student.parent_id$': req.user.id
        },
        include: [{
          model: StudentClass,
          as: 'student_class',
          attributes: [],
          include: [{
            model: Student,
            as: 'student',
            attributes: []
          }]
        }]
      }],
      order: [['date', 'DESC']]
    });

    const result = details.map(d => ({
      title: d.name,
      date: d.date,
      day: new Date(d.date).toLocaleString('id-ID', { weekday: 'long' }),
      score: d.student_grade?.[0]?.score || null
    }));

    res.json(result);
  } catch (error) {
    handleError(res, error, 'Gagal mengambil detail nilai');
  }
});

module.exports = router;