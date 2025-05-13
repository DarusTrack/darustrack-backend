const { Op } = require('sequelize');
const { AcademicYear, Semester, Class, StudentClass, Student, Attendance } = require('../models');

// Mendapatkan daftar kehadiran berdasarkan tanggal
exports.getAttendances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Tanggal (date) wajib diisi sebagai query parameter' });
        }

        // Cek semester aktif
        const activeSemester = await Semester.findOne({ where: { is_active: true } });
        if (!activeSemester) {
            return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });
        }

        // Cari kelas yang dikelola wali kelas
        const classData = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: activeSemester.academic_year_id },
        });

        if (!classData) {
            return res.status(404).json({ message: 'Wali kelas tidak mengelola kelas di semester aktif' });
        }

        // Cari kehadiran siswa berdasarkan kelas, semester, dan tanggal
        const attendances = await Attendance.findAll({
            where: {
                semester_id: activeSemester.id,
                date: date,
            },
            include: [
                {
                    model: StudentClass,
                    as: 'student_class',
                    where: { class_id: classData.id },
                    include: [
                        {
                            model: Student,
                            as: 'student',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ],
            attributes: ['id', 'student_class_id', 'status', 'date']
        });

        if (attendances.length === 0) {
            return res.status(404).json({ message: 'Tidak ada data kehadiran untuk tanggal tersebut' });
        }

        // Ubah dan urutkan data berdasarkan nama siswa
        const attendanceData = attendances
            .map(att => ({
                student_class_id: att.student_class_id,
                studentName: att.student_class.student.name,
                status: att.status,
                date: att.date
            }))
            .sort((a, b) => a.studentName.localeCompare(b.studentName)); // Urut A-Z

        res.json(attendanceData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil data kehadiran', error: error.message });
    }
};

// Tambah tanggal kehadiran baru
exports.createAttendance = async (req, res) => {
    const { date } = req.body;

    try {
        const userId = req.user.id;

        // Cari tahun ajaran aktif
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        // Cari semester aktif
        const activeSemester = await Semester.findOne({ where: { is_active: true } });
        if (!activeSemester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });

        // Cari kelas wali kelas
        const myClass = await Class.findOne({
            where: {
                teacher_id: userId,
                academic_year_id: activeYear.id
            }
        });
        if (!myClass) return res.status(404).json({ message: 'Kelas wali kelas tidak ditemukan di tahun ajaran aktif' });

        // Ambil siswa di kelas ini
        const students = await StudentClass.findAll({ where: { class_id: myClass.id } });
        if (!students.length) return res.status(404).json({ message: 'Tidak ada siswa di kelas ini' });

        // Cek apakah tanggal kehadiran sudah dibuat untuk siswa-siswa ini
        const existingAttendance = await Attendance.findOne({
            where: {
                semester_id: activeSemester.id,
                date,
                student_class_id: students.map(sc => sc.id)
            },
            attributes: ['id', 'student_class_id', 'semester_id', 'date', 'status']
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Kehadiran untuk tanggal ini sudah ada' });
        }

        // Buat data kehadiran default semua siswa (status default: 'Alpha')
        const attendanceRecords = students.map(student => ({
            student_class_id: student.id,
            semester_id: activeSemester.id,
            date,
            status: 'Not Set'
        }));

        await Attendance.bulkCreate(attendanceRecords);

        res.status(201).json({ message: 'Tanggal kehadiran berhasil ditambahkan' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan data kehadiran', error: error.message });
    }
};

// Perbarui status
exports.updatedAttendances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;
        const { attendanceUpdates } = req.body;

        // Validasi keberadaan dan format tanggal
        if (!date) {
            return res.status(400).json({ message: 'Parameter query "date" wajib diisi' });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date) || isNaN(Date.parse(date))) {
            return res.status(400).json({ message: 'Format parameter "date" tidak valid. Gunakan format YYYY-MM-DD' });
        }

        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inputDate > today) {
            return res.status(400).json({ message: 'Tanggal kehadiran tidak boleh melebihi tanggal hari ini' });
        }

        if (!Array.isArray(attendanceUpdates) || attendanceUpdates.length === 0) {
            return res.status(400).json({ message: 'Data update kehadiran tidak valid' });
        }

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
            attributes: ['id'],
        });

        const validStudentClassIds = studentClasses.map(sc => sc.id);

        const invalidUpdates = attendanceUpdates.filter(update => !validStudentClassIds.includes(update.student_class_id));
        if (invalidUpdates.length > 0) {
            return res.status(400).json({ message: 'Beberapa student_class_id tidak terdaftar di kelas ini', invalidUpdates });
        }

        const updatedAttendances = [];
        const notFound = [];

        for (const update of attendanceUpdates) {
            const existingAttendance = await Attendance.findOne({
                where: {
                    student_class_id: update.student_class_id,
                    semester_id: activeSemester.id,
                    date: date,
                }
            });

            if (existingAttendance) {
                existingAttendance.status = update.status;
                await existingAttendance.save();
                updatedAttendances.push(existingAttendance);
            } else {
                notFound.push(update.student_class_id);
            }
        }

        if (notFound.length === attendanceUpdates.length) {
            return res.status(400).json({ 
                message: 'Tanggal kehadiran belum ditambahkan',
                notFoundStudentClassIds: notFound
            });
        }

        if (notFound.length > 0) {
            return res.status(206).json({ 
                message: `${updatedAttendances.length} data berhasil diperbarui. Beberapa data tidak ditemukan karena belum ditambahkan.`,
                updatedAttendances,
                notFoundStudentClassIds: notFound
            });
        }

        res.json({ message: `${updatedAttendances.length} data kehadiran berhasil diperbarui`, updatedAttendances });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memperbarui kehadiran', error: error.message });
    }
};

// Hapus data kehadiran
exports.deleteAttendances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Parameter query "date" wajib diisi' });
        }

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
            attributes: ['id'],
        });

        const studentClassIds = studentClasses.map(sc => sc.id);

        const deletedCount = await Attendance.destroy({
            where: {
                student_class_id: studentClassIds,
                semester_id: activeSemester.id,
                date: date,
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({ message: 'Tidak ada data kehadiran yang ditemukan untuk dihapus' });
        }

        res.json({ message: `${deletedCount} data kehadiran berhasil dihapus` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus kehadiran', error: error.message });
    }
};

// Kehadiran anak per semester
exports.getStudentAttendances = async (req, res) => {
    try {
        const parentId = req.user.id;
        const semesterId = req.params.semesterId;

        // Validasi semester harus berada di tahun ajaran aktif
        const semester = await Semester.findOne({
            where: { id: semesterId },
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true },
                attributes: []
            }
        });

        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan atau tidak berada di tahun ajaran aktif' });
        }

        // Cari data siswa
        const student = await Student.findOne({ where: { parent_id: parentId } });
        if (!student) return res.status(404).json({ message: 'Data siswa tidak ditemukan' });

        // Cari student_class milik siswa yang berada di tahun ajaran semester ini
        const studentClass = await StudentClass.findOne({
            where: { student_id: student.id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: semester.academic_year_id }
            }
        });

        if (!studentClass) {
            return res.status(404).json({ message: 'Kelas siswa di tahun ajaran semester ini tidak ditemukan' });
        }

        // Ambil data kehadiran berdasarkan semester dan student_class
        const attendances = await Attendance.findAll({
            where: {
                student_class_id: studentClass.id,
                semester_id: semesterId
            },
            order: [['date', 'DESC']]
        });

        if (attendances.length === 0) {
            return res.status(404).json({ message: 'Data kehadiran tidak ditemukan untuk semester ini' });
        }

        // Format hasil
        const formattedAttendances = attendances.map(attendance => {
            const date = attendance.date;
            const day = new Date(date).toLocaleString('id-ID', { weekday: 'long' });
            return {
                date,
                day,
                status: attendance.status
            };
        });

        res.json(formattedAttendances);
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
    }
};