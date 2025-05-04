const { Class, AcademicYear, Semester, Schedule, Subject } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Get daftar kelas pada tahun ajaran dan semester aktif (filter optional grade_level)
exports.getClasses = async (req, res) => {
  try {
    const activeSemester = await Semester.findOne({
      where: { is_active: true },
      include: {
        model: AcademicYear,
        as: 'academic_year',
        where: { is_active: true },
        required: true
      }
    });

    if (!activeSemester) {
      return res.status(404).json({ message: 'Tidak ada semester aktif ditemukan' });
    }

    const { grade_level } = req.query;

    const whereConditions = {
      academic_year_id: activeSemester.academic_year_id
    };

    if (grade_level) {
      whereConditions.name = {
        [Sequelize.Op.like]: `${grade_level}%`
      };
    }

    const foundClasses = await Class.findAll({
      where: whereConditions,
      attributes: ['id', 'name', 'academic_year_id', 'teacher_id']
    });

    const classesWithGradeLevel = foundClasses.map(cls => {
      const gradeLevel = parseInt(cls.name.charAt(0));
      return {
        ...cls.toJSON(),
        grade_level: isNaN(gradeLevel) ? null : gradeLevel
      };
    });

    res.json(classesWithGradeLevel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data kelas', error });
  }
};

exports.getMyClass = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });

    if (!activeYear) {
      return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
    }

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
};

exports.getMySchedules = async (req, res) => {
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
      include: [{
        model: Subject,
        as: 'subject',
        attributes: ['id', 'name']
      }],
      order: [['day', 'ASC'], ['start_time', 'ASC']]
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
    res.status(500).json({ message: 'Gagal mengambil jadwal kelas', error: error.message });
  }
};

// Get jadwal pelajaran kelas tertentu (filter harian)
exports.getSchedule = async (req, res) => {
  const { day } = req.query;
  const whereClause = { class_id: req.params.class_id };
  if (day) whereClause.day = day;

  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const schedule = await Schedule.findAll({
      where: whereClause,
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['name']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'academic_year_id'],
          where: { academic_year_id: activeYear.id }
        }
      ],
      order: [['day', 'ASC'], ['start_time', 'ASC']]
    });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedule', error });
  }
};

// Tambah jadwal baru
exports.createSchedule = async (req, res) => {
  const { subject_id, day, start_time, end_time } = req.body;
  const { class_id } = req.params;

  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const classData = await Class.findOne({ where: { id: class_id, academic_year_id: activeYear.id } });
    if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran aktif' });

    const conflictingSchedule = await Schedule.findOne({
      where: {
        class_id,
        day,
        [Op.or]: [
          { start_time: { [Op.between]: [start_time, end_time] } },
          { end_time: { [Op.between]: [start_time, end_time] } },
          { [Op.and]: [{ start_time: { [Op.lte]: start_time } }, { end_time: { [Op.gte]: end_time } }] }
        ]
      }
    });

    if (conflictingSchedule) {
      return res.status(400).json({ message: 'Terdapat jadwal lain yang bentrok' });
    }

    const schedule = await Schedule.create({ class_id, subject_id, day, start_time, end_time });
    res.status(201).json({ message: 'Jadwal berhasil ditambahkan', schedule });
  } catch (error) {
    res.status(500).json({ message: 'Error menambahkan jadwal', error });
  }
};

// Edit jadwal
exports.updateSchedule = async (req, res) => {
  const { schedule_id } = req.params;
  const { subject_id, day, start_time, end_time } = req.body;

  if ((start_time || end_time) && (!start_time || !end_time)) {
    return res.status(400).json({ message: 'Jika mengubah waktu, kedua waktu harus diisi' });
  }

  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const schedule = await Schedule.findOne({
      where: { id: schedule_id },
      include: {
        model: Class,
        as: 'class',
        where: { academic_year_id: activeYear.id }
      }
    });

    if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

    if (start_time || end_time) {
      const conflictingSchedule = await Schedule.findOne({
        where: {
          id: { [Op.ne]: schedule_id },
          class_id: schedule.class_id,
          day: day || schedule.day,
          [Op.or]: [
            { start_time: { [Op.between]: [start_time, end_time] } },
            { end_time: { [Op.between]: [start_time, end_time] } },
            { [Op.and]: [{ start_time: { [Op.lte]: start_time } }, { end_time: { [Op.gte]: end_time } }] }
          ]
        }
      });

      if (conflictingSchedule) {
        return res.status(400).json({ message: 'Terdapat jadwal yang bentrok' });
      }
    }

    const exactSameSchedule = await Schedule.findOne({
      where: {
        id: { [Op.ne]: schedule_id },
        class_id: schedule.class_id,
        day: day || schedule.day,
        start_time: start_time || schedule.start_time,
        end_time: end_time || schedule.end_time
      }
    });

    if (exactSameSchedule) {
      return res.status(400).json({ message: 'Jadwal yang sama sudah ada' });
    }

    await schedule.update({
      subject_id: subject_id || schedule.subject_id,
      day: day || schedule.day,
      start_time: start_time || schedule.start_time,
      end_time: end_time || schedule.end_time
    });

    res.json({ message: 'Jadwal berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Error mengedit jadwal', error });
  }
};

// Hapus jadwal
exports.deleteSchedule = async (req, res) => {
  const { schedule_id } = req.params;

  try {
    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const schedule = await Schedule.findOne({
      where: { id: schedule_id },
      include: {
        model: Class,
        as: 'class',
        where: { academic_year_id: activeYear.id }
      }
    });

    if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

    await schedule.destroy();
    res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Error menghapus jadwal', error });
  }
};
