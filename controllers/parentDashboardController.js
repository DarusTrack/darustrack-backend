const {
    User, AcademicYear, Semester, Student, StudentClass, Attendance,
    Schedule, Subject, Class, Evaluation, AcademicCalendar, StudentEvaluation,
    GradeCategory, GradeDetail, StudentGrade
  } = require('../models');
  const { Op } = require('sequelize');
  
  // 🔹 GET: Profil Anak
  exports.getStudentProfile = async (req, res) => {
    try {
      const student = await Student.findOne({
        where: { parent_id: req.user.id },
        attributes: ['name', 'nisn', 'birth_date'],
        include: {
          model: StudentClass,
          as: "student_class",
          attributes: ['id'],
          include: {
            model: Class,
            as: 'class',
            attributes: ['name'],
            include: {
              model: User,
              as: 'teacher',
              attributes: ['name']
            }
          }
        }
      });
  
      if (!student) return res.status(404).json({ message: 'Data anak tidak ditemukan' });
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  // 🔹 GET: Jadwal Siswa
  exports.getStudentSchedule = async (req, res) => {
    try {
      const student = await Student.findOne({
        where: { parent_id: req.user.id },
        include: {
          model: StudentClass,
          as: 'student_class',
          attributes: ['class_id'],
          include: {
            model: Class,
            as: 'class',
            attributes: ['id', 'academic_year_id'],
            include: {
              model: AcademicYear,
              as: 'academic_year',
              where: { is_active: true },
              attributes: ['id']
            }
          }
        }
      });
  
      const studentClass = student?.student_class?.[0];
      const classId = studentClass?.class_id;
  
      if (!classId) return res.status(404).json({ message: 'Kelas anak tidak ditemukan' });
  
      const where = { class_id: classId };
      if (req.query.day) where.day = req.query.day;
  
      const schedules = await Schedule.findAll({
        where,
        attributes: ['day', 'start_time', 'end_time'],
        include: { model: Subject, as: 'subject', attributes: ['name'] },
        order: [['day', 'ASC'], ['start_time', 'ASC']]
      });
  
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  // 🔹 GET: Kalender Akademik
  exports.getAcademicCalendar = async (req, res) => {
    try {
      const events = await AcademicCalendar.findAll({
        attributes: ['event_name', 'start_date', 'end_date']
      });
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  // 🔹 GET: Kehadiran Anak
  exports.getStudentAttendance = async (req, res) => {
    try {
      const student = await Student.findOne({ where: { parent_id: req.user.id } });
      const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
  
      const attendances = await Attendance.findAll({
        where: {
          student_class_id: studentClass.id,
          semester_id: req.params.semesterId
        },
        include: {
          model: StudentClass,
          as: 'student_class',
          include: {
            model: Student,
            as: 'student',
            attributes: ['id', 'name']
          }
        },
        order: [['date', 'DESC']]
      });
  
      const formatted = attendances.map(a => ({
        date: a.date,
        day: new Date(a.date).toLocaleString('id-ID', { weekday: 'long' }),
        status: a.status
      }));
  
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // 🔹 GET: Evaluasi Per Semester
  exports.getStudentEvaluations = async (req, res) => {
    try {
      const student = await Student.findOne({ where: { parent_id: req.user.id } });
      const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
  
      const evaluations = await StudentEvaluation.findAll({
        where: { student_class_id: studentClass.id },
        include: {
          model: Evaluation,
          as: 'evaluation',
          where: { semester_id: req.params.semesterId },
          attributes: ['id', 'title'],
          include: {
            model: Semester,
            as: 'semester',
            attributes: ['id', 'name']
          }
        }
      });
  
      const result = evaluations.map(e => ({
        id: e.evaluation.id,
        title: e.evaluation.title,
        semester_id: e.evaluation.semester.id,
        semester_name: e.evaluation.semester.name
      }));
  
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // 🔹 GET: Detail Evaluasi
  exports.getStudentEvaluationDetail = async (req, res) => {
    try {
      const student = await Student.findOne({ where: { parent_id: req.user.id } });
      const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
  
      const studentEvaluation = await StudentEvaluation.findOne({
        where: {
          student_class_id: studentClass.id,
          evaluation_id: req.params.evaluationId
        },
        include: {
          model: Evaluation,
          as: 'evaluation',
          where: { semester_id: req.params.semesterId },
          attributes: ['id', 'title']
        }
      });
  
      if (!studentEvaluation) {
        return res.status(404).json({ message: 'Evaluasi tidak ditemukan.' });
      }
  
      res.json({
        id: studentEvaluation.evaluation.id,
        title: studentEvaluation.evaluation.title,
        description: studentEvaluation.description
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // 🔹 GET: Daftar Mapel Anak
  exports.getStudentSubjects = async (req, res) => {
    try {
      const student = await Student.findOne({ where: { parent_id: req.user.id } });
      const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
  
      const semester = await Semester.findByPk(req.params.semesterId, {
        include: { model: AcademicYear, as: 'academic_year' }
      });
  
      const schedules = await Schedule.findAll({
        where: { class_id: studentClass.class_id },
        include: {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name']
        }
      });
  
      const uniqueSubjects = {};
      schedules.forEach(sch => {
        if (sch.subject && !uniqueSubjects[sch.subject.id]) {
          uniqueSubjects[sch.subject.id] = {
            ...sch.subject.toJSON(),
            semester_id: semester.id,
            semester_name: semester.name,
            academic_year_id: semester.academic_year.id,
            academic_year_name: semester.academic_year.year,
            is_academic_year_active: semester.academic_year.is_active
          };
        }
      });
  
      res.json(Object.values(uniqueSubjects));
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // 🔹 GET: Kategori Nilai per Mapel
  exports.getGradeCategories = async (req, res) => {
    try {
      const student = await Student.findOne({ where: { parent_id: req.user.id } });
      const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
  
      const gradeCategories = await GradeCategory.findAll({
        where: {
          subject_id: req.params.subjectId,
          semester_id: req.params.semesterId,
          class_id: studentClass.class_id
        }
      });
  
      res.json(gradeCategories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // 🔹 GET: Detail Nilai per Kategori
  exports.getGradeDetails = async (req, res) => {
    try {
      const student = await Student.findOne({ where: { parent_id: req.user.id } });
      const studentClass = await StudentClass.findOne({ where: { student_id: student.id } });
  
      const gradeDetails = await GradeDetail.findAll({
        where: { grade_category_id: req.params.gradeCategoryId },
        include: {
          model: StudentGrade,
          as: 'student_grade',
          where: { student_class_id: studentClass.id },
          required: false
        }
      });
  
      const result = gradeDetails.map(detail => ({
        title: detail.name,
        date: detail.date,
        day: new Date(detail.date).toLocaleString('id-ID', { weekday: 'long' }),
        score: detail.student_grade[0]?.score ?? null
      }));
  
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};
  