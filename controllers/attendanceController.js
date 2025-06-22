const { Op } = require('sequelize');
const {
  sequelize, Semester, Class, StudentClass,
  Attendance, AcademicYear
} = require('../models');

// GET /attendances/rekap
exports.rekapDates = async (req, res) => {
  try {
    const activeSemester = await Semester.findOne({ where: { is_active: true } });
    if (!activeSemester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });

    const classData = await Class.findOne({
      where: { teacher_id: req.user.id, academic_year_id: activeSemester.academic_year_id }
    });
    if (!classData) return res.status(404).json({ message: 'Wali kelas tidak mengelola kelas' });

    const studentClassIds = (await StudentClass.findAll({
      where: { class_id: classData.id }, attributes: ['id']
    })).map(sc => sc.id);
    if (!studentClassIds.length) return res.status(404).json({ message: 'Tidak ada siswa' });

    const dates = await Attendance.findAll({
      where: { semester_id: activeSemester.id, student_class_id: { [Op.in]: studentClassIds } },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('date')), 'date']],
      order: [['date', 'DESC']], raw: true
    });
    if (!dates.length) return res.status(404).json({ message: 'Belum ada data kehadiran' });

    return res.json({
      semester_id: activeSemester.id,
      class_id: classData.id,
      total_dates: dates.length,
      dates: dates.map(d => d.date)
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Terjadi kesalahan', error: e.message });
  }
};

// helper
const getTeacherClass = async (userId, academicYearId) =>
  Class.findOne({ where: { teacher_id: userId, academic_year_id: academicYearId } });

// GET /attendances?date=
exports.listByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Parameter "date" wajib diisi' });

    const classData = await getTeacherClass(req.user.id, req.activeSemester.academic_year_id);
    if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    const attendances = await Attendance.findAll({
      where: { semester_id: req.activeSemester.id, date },
      include: {
        model: StudentClass,
        as: 'student_class',
        where: { class_id: classData.id },
        include: { model: require('../models').Student, as: 'student', attributes: ['id', 'name'] }
      },
      attributes: ['id', 'student_class_id', 'status', 'date']
    });

    if (!attendances.length) return res.status(404).json({ message: 'Tidak ada data kehadiran' });

    const result = attendances
      .map(a => ({
        student_class_id: a.student_class_id,
        studentName: a.student_class.student.name,
        status: a.status,
        date: a.date
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Terjadi kesalahan', error: e.message });
  }
};

// POST /attendances   { date }
exports.addDate = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Tanggal wajib diisi' });

    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const myClass = await getTeacherClass(req.user.id, activeYear.id);
    if (!myClass) return res.status(404).json({ message: 'Kelas wali kelas tidak ditemukan' });

    const studentClassIds = (await StudentClass.findAll({
      where: { class_id: myClass.id }, attributes: ['id']
    })).map(s => s.id);

    if (!studentClassIds.length) return res.status(404).json({ message: 'Tidak ada siswa di kelas' });

    const already = await Attendance.count({
      where: { semester_id: req.activeSemester.id, date, student_class_id: { [Op.in]: studentClassIds } }
    });
    if (already) return res.status(400).json({ message: 'Kehadiran untuk tanggal ini sudah ada' });

    const rows = studentClassIds.map(id => ({
      student_class_id: id,
      semester_id: req.activeSemester.id,
      date,
      status: 'Not Set'
    }));
    await Attendance.bulkCreate(rows);

    return res.status(201).json({ message: 'Tanggal kehadiran berhasil ditambahkan' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Gagal menambahkan kehadiran', error: e.message });
  }
};

// PUT /attendances?date=   { attendanceUpdates: [{student_class_id, status}] }
exports.updateStatus = async (req, res) => {
  try {
    const { date } = req.query;
    const { attendanceUpdates } = req.body;
    if (!date) return res.status(400).json({ message: 'Parameter "date" wajib' });
    if (!Array.isArray(attendanceUpdates) || !attendanceUpdates.length)
      return res.status(400).json({ message: 'attendanceUpdates tidak valid' });

    const classData = await getTeacherClass(req.user.id, req.activeSemester.academic_year_id);
    if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    const validIds = (await StudentClass.findAll({
      where: { class_id: classData.id }, attributes: ['id']
    })).map(s => s.id);

    const invalid = attendanceUpdates.filter(u => !validIds.includes(u.student_class_id));
    if (invalid.length) return res.status(400).json({ message: 'student_class_id tidak valid', invalid });

    const results = await Promise.all(
      attendanceUpdates.map(async upd => {
        const rec = await Attendance.findOne({
          where: {
            student_class_id: upd.student_class_id,
            semester_id: req.activeSemester.id,
            date
          }
        });
        if (rec) {
          rec.status = upd.status;
          await rec.save();
          return { ok: true };
        }
        return { ok: false, id: upd.student_class_id };
      })
    );

    const notFound = results.filter(r => !r.ok).map(r => r.id);
    const updated = results.length - notFound.length;
    const msg = notFound.length
      ? `${updated} diperbarui, ${notFound.length} tidak ditemukan`
      : `${updated} data berhasil diperbarui`;
    return res.status(notFound.length ? 206 : 200).json({ message: msg, notFound });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Gagal memperbarui kehadiran', error: e.message });
  }
};

// DELETE /attendances?date=
exports.removeByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Parameter "date" wajib diisi' });

    const classData = await getTeacherClass(req.user.id, req.activeSemester.academic_year_id);
    if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    const ids = (await StudentClass.findAll({
      where: { class_id: classData.id }, attributes: ['id']
    })).map(s => s.id);

    const deleted = await Attendance.destroy({
      where: { student_class_id: { [Op.in]: ids }, semester_id: req.activeSemester.id, date }
    });
    if (!deleted) return res.status(404).json({ message: 'Tidak ada data dihapus' });

    return res.json({ message: `${deleted} data kehadiran berhasil dihapus` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Gagal menghapus kehadiran', error: e.message });
  }
};
