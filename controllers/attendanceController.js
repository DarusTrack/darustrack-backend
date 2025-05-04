const {
    Semester, AcademicYear, Class, StudentClass, Attendance
  } = require('../../models');
  const { Op } = require('sequelize');
  
  // GET: Kehadiran siswa berdasarkan tanggal
  exports.getAttendancesByDate = async (req, res) => {
    try {
      const { date } = req.query;
      const userId = req.user.id;
  
      if (!date) return res.status(400).json({ message: 'Parameter "date" wajib diisi' });
  
      const activeSemester = await Semester.findOne({ where: { is_active: true } });
      if (!activeSemester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });
  
      const classData = await Class.findOne({
        where: { teacher_id: userId, academic_year_id: activeSemester.academic_year_id }
      });
      if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });
  
      const attendances = await Attendance.findAll({
        where: { semester_id: activeSemester.id, date },
        include: {
          model: StudentClass,
          as: 'student_class',
          where: { class_id: classData.id },
          include: {
            model: require('../../models').Student,
            as: 'student',
            attributes: ['id', 'name']
          }
        },
        attributes: ['id', 'student_class_id', 'status', 'date']
      });
  
      if (attendances.length === 0) {
        return res.status(404).json({ message: 'Tidak ada data kehadiran ditemukan' });
      }
  
      const data = attendances.map(att => ({
        student_class_id: att.student_class_id,
        studentName: att.student_class.student.name,
        status: att.status,
        date: att.date
      }));
  
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: 'Gagal mengambil kehadiran', error: error.message });
    }
  };
  
  // POST: Tambah tanggal kehadiran
  exports.addAttendanceDate = async (req, res) => {
    try {
      const { date } = req.body;
      const userId = req.user.id;
  
      const [activeYear, activeSemester] = await Promise.all([
        AcademicYear.findOne({ where: { is_active: true } }),
        Semester.findOne({ where: { is_active: true } })
      ]);
      if (!activeYear || !activeSemester) {
        return res.status(404).json({ message: 'Tahun ajaran atau semester aktif tidak ditemukan' });
      }
  
      const myClass = await Class.findOne({
        where: { teacher_id: userId, academic_year_id: activeYear.id }
      });
      if (!myClass) return res.status(404).json({ message: 'Kelas wali kelas tidak ditemukan' });
  
      const students = await StudentClass.findAll({ where: { class_id: myClass.id } });
      if (students.length === 0) return res.status(404).json({ message: 'Tidak ada siswa' });
  
      const existing = await Attendance.findOne({
        where: {
          semester_id: activeSemester.id,
          date,
          student_class_id: students.map(sc => sc.id)
        }
      });
      if (existing) return res.status(400).json({ message: 'Data kehadiran untuk tanggal ini sudah ada' });
  
      const records = students.map(sc => ({
        student_class_id: sc.id,
        semester_id: activeSemester.id,
        date,
        status: 'Not Set'
      }));
  
      await Attendance.bulkCreate(records);
      res.status(201).json({ message: 'Tanggal kehadiran berhasil ditambahkan' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menambahkan kehadiran', error: error.message });
    }
  };
  
  // PUT: Perbarui status kehadiran
  exports.updateAttendanceStatus = async (req, res) => {
    try {
      const userId = req.user.id;
      const { date } = req.query;
      const { attendanceUpdates } = req.body;
  
      if (!date || !Array.isArray(attendanceUpdates)) {
        return res.status(400).json({ message: 'Tanggal dan data update wajib disediakan' });
      }
  
      const activeSemester = await Semester.findOne({ where: { is_active: true } });
      const myClass = await Class.findOne({
        where: { teacher_id: userId, academic_year_id: activeSemester.academic_year_id }
      });
  
      const validIds = (await StudentClass.findAll({ where: { class_id: myClass.id } })).map(sc => sc.id);
      const invalid = attendanceUpdates.filter(u => !validIds.includes(u.student_class_id));
      if (invalid.length > 0) return res.status(400).json({ message: 'Beberapa ID tidak valid', invalid });
  
      const updates = [];
      for (const update of attendanceUpdates) {
        const record = await Attendance.findOne({
          where: {
            student_class_id: update.student_class_id,
            semester_id: activeSemester.id,
            date
          }
        });
        if (record) {
          record.status = update.status;
          await record.save();
          updates.push(record);
        }
      }
  
      res.json({ message: 'Update berhasil', updated: updates.length });
    } catch (error) {
      res.status(500).json({ message: 'Gagal memperbarui kehadiran', error: error.message });
    }
  };
  
  // DELETE: Hapus kehadiran berdasarkan tanggal
  exports.deleteAttendanceByDate = async (req, res) => {
    try {
      const { date } = req.query;
      const userId = req.user.id;
  
      if (!date) return res.status(400).json({ message: 'Tanggal wajib diisi' });
  
      const semester = await Semester.findOne({ where: { is_active: true } });
      const myClass = await Class.findOne({
        where: { teacher_id: userId, academic_year_id: semester.academic_year_id }
      });
  
      const studentClasses = await StudentClass.findAll({ where: { class_id: myClass.id } });
      const ids = studentClasses.map(sc => sc.id);
  
      const deleted = await Attendance.destroy({
        where: {
          student_class_id: ids,
          semester_id: semester.id,
          date
        }
      });
  
      if (deleted === 0) {
        return res.status(404).json({ message: 'Tidak ada data ditemukan untuk dihapus' });
      }
  
      res.json({ message: `${deleted} data kehadiran berhasil dihapus` });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghapus kehadiran', error: error.message });
    }
  };
  