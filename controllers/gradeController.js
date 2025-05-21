const { Op } = require('sequelize');
const { GradeCategory, GradeDetail, StudentGrade, Class, Subject, Schedule, StudentClass } = require('../models');

class GradeController {
  // Get subjects for grading
  static async getSubjectsForGrading(req, res) {
    try {
      const activeAcademicYear = await AcademicYear.findOne({
        where: { is_active: true },
        attributes: ['id']
      });

      if (!activeAcademicYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

      const teacherClass = await Class.findOne({
        where: { teacher_id: req.user.id, academic_year_id: activeAcademicYear.id },
        attributes: ['id']
      });

      if (!teacherClass) return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar di tahun ajaran aktif' });

      const subjects = await Schedule.findAll({
        where: { class_id: teacherClass.id },
        include: {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name']
        },
        attributes: ['subject_id'],
        raw: true,
        nest: true
      });

      const seen = new Set();
      const uniqueSubjects = subjects
        .filter(s => !seen.has(s.subject.id) && seen.add(s.subject.id))
        .map(s => ({
          subject_id: s.subject.id,
          subject_name: s.subject.name
        }))
        .sort((a, b) => a.subject_name.localeCompare(b.subject_name));

      res.json(uniqueSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Other grade methods...
}

module.exports = GradeController;