const { Op } = require('sequelize');
const { Attendance, StudentClass, Student, Class, Semester, AcademicYear } = require('../models');

class AttendanceController {
  // Get attendance dates
  static async getAttendanceDates(req, res) {
    try {
      const userId = req.user.id;
      const activeSemester = await Semester.findOne({ where: { is_active: true } });
      if (!activeSemester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });

      const classData = await Class.findOne({
        where: { teacher_id: userId, academic_year_id: activeSemester.academic_year_id },
      });

      if (!classData) return res.status(404).json({ message: 'Wali kelas tidak mengelola kelas di semester aktif' });

      const studentClasses = await StudentClass.findAll({
        where: { class_id: classData.id },
        attributes: ['id']
      });

      const studentClassIds = studentClasses.map(sc => sc.id);
      if (studentClassIds.length === 0) return res.status(404).json({ message: 'Tidak ada siswa di kelas ini' });

      const dates = await Attendance.findAll({
        where: {
          semester_id: activeSemester.id,
          student_class_id: { [Op.in]: studentClassIds }
        },
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('date')), 'date']
        ],
        order: [['date', 'DESC']],
        raw: true
      });

      if (dates.length === 0) return res.status(404).json({ message: 'Belum ada data kehadiran yang tercatat' });

      res.json({
        semester_id: activeSemester.id,
        class_id: classData.id,
        total_dates: dates.length,
        dates: dates.map(d => d.date)
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Terjadi kesalahan saat mengambil rekapan tanggal kehadiran', error: error.message });
    }
  }

  // Other attendance methods...
}

module.exports = AttendanceController;