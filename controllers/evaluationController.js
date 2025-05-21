const { Evaluation, StudentEvaluation, StudentClass, Student, Semester, AcademicYear, Class } = require('../models');

class EvaluationController {
  // Get evaluations by semester
  static async getEvaluationsBySemester(req, res) {
    try {
      const userId = req.user.id;
      const semesterId = req.params.semester_id;

      const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
      const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: activeYear.id } });

      if (!myClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

      const evaluations = await Evaluation.findAll({
        where: {
          class_id: myClass.id,
          semester_id: semesterId
        },
        order: [['title', 'ASC']]
      });

      res.json({ evaluations });
    } catch (error) {
      res.status(500).json({ message: 'Gagal mengambil evaluasi', error: error.message });
    }
  }

  // Other evaluation methods...
}

module.exports = EvaluationController;