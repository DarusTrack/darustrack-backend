const { Op } = require('sequelize');
const { sequelize, Class, StudentClass, Attendance, Semester, Student } = require('../models');

const getAttendanceDates = async (req, res) => {
    try {
        const userId = req.user.id;

        const activeSemester = await Semester.findOne({ where: { is_active: true } });
        if (!activeSemester) {
            return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });
        }

        const classData = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: activeSemester.academic_year_id },
        });

        if (!classData) {
            return res.status(404).json({ message: 'Wali kelas tidak mengelola kelas di semester aktif' });
        }

        const studentClasses = await StudentClass.findAll({
            where: { class_id: classData.id },
            attributes: ['id']
        });

        const studentClassIds = studentClasses.map(sc => sc.id);
        if (studentClassIds.length === 0) {
            return res.status(404).json({ message: 'Tidak ada siswa di kelas ini' });
        }

        const dates = await Attendance.findAll({
            where: {
                semester_id: activeSemester.id,
                student_class_id: {
                    [Op.in]: studentClassIds
                }
            },
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('date')), 'date']
            ],
            order: [['date', 'DESC']],
            raw: true
        });

        if (dates.length === 0) {
            return res.status(404).json({ message: 'Belum ada data kehadiran yang tercatat' });
        }

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
};

const getAttendances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;

        if (!date) return res.status(400).json({ message: 'Parameter query "date" wajib diisi' });

        const classData = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: req.activeSemester.academic_year_id },
        });

        if (!classData) return res.status(404).json({ message: 'Wali kelas tidak mengelola kelas di semester aktif' });

        const attendances = await Attendance.findAll({
            where: {
                semester_id: req.activeSemester.id,
                date: date,
            },
            include: [
                {
                    model: StudentClass,
                    as: 'student_class',
                    where: { class_id: classData.id },
                    include: [{
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'name']
                    }]
                }
            ],
            attributes: ['id', 'student_class_id', 'status', 'date']
        });

        if (attendances.length === 0) {
            return res.status(404).json({ message: 'Tidak ada data kehadiran untuk tanggal tersebut' });
        }

        const attendanceData = attendances.map(att => ({
            student_class_id: att.student_class_id,
            studentName: att.student_class.student.name,
            status: att.status,
            date: att.date
        })).sort((a, b) => a.studentName.localeCompare(b.studentName));

        res.json(attendanceData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data kehadiran', error: error.message });
    }
};

const createAttendanceDate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.body;

        if (!date) return res.status(400).json({ message: 'Tanggal wajib diisi' });

        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: activeYear.id }
        });
        if (!myClass) return res.status(404).json({ message: 'Kelas wali kelas tidak ditemukan' });

        const students = await StudentClass.findAll({
            where: { class_id: myClass.id },
            attributes: ['id']
        });

        if (!students.length) return res.status(404).json({ message: 'Tidak ada siswa di kelas ini' });

        const studentClassIds = students.map(s => s.id);

        const existing = await Attendance.findAll({
            where: {
                semester_id: req.activeSemester.id,
                date,
                student_class_id: { [Op.in]: studentClassIds }
            },
            attributes: ['id']
        });

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Kehadiran untuk tanggal ini sudah ada' });
        }

        const attendanceRecords = studentClassIds.map(id => ({
            student_class_id: id,
            semester_id: req.activeSemester.id,
            date,
            status: 'Not Set'
        }));

        const t = await sequelize.transaction();
        await Attendance.bulkCreate(attendanceRecords, { transaction: t });
        await t.commit();

        res.status(201).json({ message: 'Tanggal kehadiran berhasil ditambahkan' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan kehadiran', error: error.message });
    }
};

const updateAttendances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;
        const { attendanceUpdates } = req.body;

        if (!date) return res.status(400).json({ message: 'Parameter query "date" wajib diisi' });
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date) || isNaN(Date.parse(date))) {
            return res.status(400).json({ message: 'Format tanggal tidak valid' });
        }

        if (!Array.isArray(attendanceUpdates) || attendanceUpdates.length === 0) {
            return res.status(400).json({ message: 'Data update kehadiran tidak valid' });
        }

        const classData = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: req.activeSemester.academic_year_id },
        });

        if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

        const studentClasses = await StudentClass.findAll({
            where: { class_id: classData.id },
            attributes: ['id']
        });

        const validIds = studentClasses.map(s => s.id);
        const invalid = attendanceUpdates.filter(u => !validIds.includes(u.student_class_id));

        if (invalid.length > 0) {
            return res.status(400).json({ message: 'Beberapa student_class_id tidak valid', invalid });
        }

        const updatedResults = await Promise.all(attendanceUpdates.map(async (update) => {
            const existing = await Attendance.findOne({
                where: {
                    student_class_id: update.student_class_id,
                    semester_id: req.activeSemester.id,
                    date
                }
            });

            if (existing) {
                existing.status = update.status;
                await existing.save();
                return { updated: true, data: existing };
            } else {
                return { updated: false, student_class_id: update.student_class_id };
            }
        }));

        const updated = updatedResults.filter(r => r.updated).map(r => r.data);
        const notFound = updatedResults.filter(r => !r.updated).map(r => r.student_class_id);

        if (notFound.length === attendanceUpdates.length) {
            return res.status(400).json({ message: 'Tanggal kehadiran belum ditambahkan', notFoundStudentClassIds: notFound });
        }

        const responseMessage = notFound.length > 0
            ? `${updated.length} berhasil diperbarui, ${notFound.length} tidak ditemukan.`
            : `${updated.length} data berhasil diperbarui`;

        const statusCode = notFound.length > 0 ? 206 : 200;

        res.status(statusCode).json({
            message: responseMessage,
            updatedAttendances: updated,
            ...(notFound.length > 0 && { notFoundStudentClassIds: notFound })
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui kehadiran', error: error.message });
    }
};

const deleteAttendances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;

        if (!date) return res.status(400).json({ message: 'Parameter query "date" wajib diisi' });

        const classData = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: req.activeSemester.academic_year_id },
        });

        if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

        const studentClasses = await StudentClass.findAll({
            where: { class_id: classData.id },
            attributes: ['id']
        });

        const ids = studentClasses.map(s => s.id);

        const deleted = await Attendance.destroy({
            where: {
                student_class_id: { [Op.in]: ids },
                semester_id: req.activeSemester.id,
                date
            }
        });

        if (deleted === 0) return res.status(404).json({ message: 'Tidak ada data kehadiran ditemukan' });

        res.json({ message: `${deleted} data kehadiran berhasil dihapus` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus kehadiran', error: error.message });
    }
};

module.exports = {
    loadActiveSemester,
    getAttendanceDates,
    getAttendances,
    createAttendanceDate,
    updateAttendances,
    deleteAttendances
};