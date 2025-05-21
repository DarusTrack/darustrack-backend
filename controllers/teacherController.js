const { Op } = require('sequelize');
const { 
  User, Semester, Student, StudentClass, Evaluation, Attendance, 
  StudentEvaluation, Schedule, Subject, GradeCategory, GradeDetail, 
  StudentGrade, Class, AcademicYear 
} = require('../models');

class TeacherController {
  // Middleware for active semester
  static async loadActiveSemester(req, res, next) {
    try {
      const semester = await Semester.findOne({ where: { is_active: true } });
      if (!semester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });
      req.activeSemester = semester;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Gagal memuat semester aktif', error: err.message });
    }
  }

  // Get teacher's class
  static async getMyClass(req, res) {
    try {
      const userId = req.user.id;
      const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
      if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

      const myClass = await Class.findOne({
        where: {
          teacher_id: userId,
          academic_year_id: activeYear.id
        }
      });

      if (!myClass) {
        return res.status(404).json({ message: 'Kelas tidak ditemukan untuk wali kelas ini di tahun ajaran aktif' });
      }

      res.json({ message: 'Kelas wali kelas berhasil ditemukan', class: myClass });
    } catch (error) {
      res.status(500).json({ message: 'Error mengambil data kelas wali kelas', error });
    }
  }

  // Get class schedules
  static async getSchedules(req, res) {
    try {
      const userId = req.user.id;
      const { day } = req.query;

      const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
      if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

      const myClass = await Class.findOne({
        where: {
          teacher_id: userId,
          academic_year_id: activeYear.id
        }
      });
      if (!myClass) return res.status(404).json({ message: 'Anda tidak mengampu kelas apapun di tahun ajaran aktif ini' });

      const whereCondition = { class_id: myClass.id };
      if (day) whereCondition.day = day;

      const schedules = await Schedule.findAll({
        where: whereCondition,
        include: [
          {
            model: Subject,
            as: 'subject',
            attributes: ['id', 'name']
          }
        ],
        order: [
          ['day', 'ASC'],
          ['start_time', 'ASC']
        ]
      });

      const output = schedules.map(s => ({
        class_id: myClass.id,
        class_name: myClass.name,
        subject_id: s.subject_id,
        subject_name: s.subject.name,
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time
      }));

      res.json(output);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Gagal mengambil jadwal kelas', error: error.message });
    }
  }

  // Other methods for attendance, evaluations, grades etc...
  // [Previous methods would be continued here...]
}

module.exports = TeacherController;