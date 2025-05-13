const { Op } = require('sequelize');
const { 
  User, 
  AcademicYear, 
  Class, 
  Schedule, 
  Subject
} = require('../models');

// Helper functions
const handleError = (res, error, defaultMessage) => {
  console.error(error);
  res.status(500).json({ message: defaultMessage, error: error.message });
};

// Kelas Wali
exports.getMyClass = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const myClass = await Class.findOne({
      where: { teacher_id: req.user.id, academic_year_id: activeYear.id }
    });

    myClass 
      ? res.json({ message: 'Kelas wali kelas berhasil ditemukan', class: myClass })
      : res.status(404).json({ message: 'Kelas tidak ditemukan' });
  } catch (error) {
    handleError(res, error, 'Error mengambil data kelas wali kelas');
  }
};

// Jadwal Mengajar
exports.getSchedules = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const myClass = await Class.findOne({
      where: { teacher_id: req.user.id, academic_year_id: activeYear.id }
    });
    if (!myClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    const whereCondition = { class_id: myClass.id };
    if (req.query.day) whereCondition.day = req.query.day;

    const schedules = await Schedule.findAll({
      where: whereCondition,
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
      order: [['day', 'ASC'], ['start_time', 'ASC']]
    });

    const formatted = schedules.map(s => ({
      class_id: myClass.id,
      class_name: myClass.name,
      subject_id: s.subject_id,
      subject_name: s.subject.name,
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time
    }));

    res.json(formatted);
  } catch (error) {
    handleError(res, error, 'Gagal mengambil jadwal kelas');
  }
};