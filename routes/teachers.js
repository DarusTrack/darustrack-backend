const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Semester, Student, StudentClass, Evaluation, Attendance, StudentEvaluation, Schedule, Subject, GradeCategory, GradeDetail, StudentGrade, Class, AcademicYear } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Ambil kelas yang menjadi tanggung jawab wali kelas
router.get('/my-class', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const userId = req.user.id;

        // Cari tahun ajaran aktif
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        // Cari kelas yang menjadi tanggung jawab wali kelas pada tahun ajaran aktif
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
});

// Mendapatkan jadwal kelas yang dikelola oleh wali kelas pada tahun ajaran aktif
router.get('/schedules', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const userId = req.user.id; // ID wali kelas dari user yang login
        const { day } = req.query;  // Ambil filter hari dari query parameter (misal: /schedules?day=Senin)

        // 1. Cari tahun ajaran aktif
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) {
            return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        // 2. Cari kelas yang diampu wali kelas
        const myClass = await Class.findOne({
            where: {
                teacher_id: userId,
                academic_year_id: activeYear.id
            }
        });
        if (!myClass) {
            return res.status(404).json({ message: 'Anda tidak mengampu kelas apapun di tahun ajaran aktif ini' });
        }

        // 3. Siapkan kondisi filter
        const whereCondition = { class_id: myClass.id };
        if (day) {
            whereCondition.day = day; // Tambahkan filter day jika diberikan
        }

        // 4. Ambil jadwal dengan filter
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

        // 5. Format output
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
});

// Mendapatkan daftar kehadiran berdasarkan tanggal
router.get('/attendances', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
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
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data kehadiran', error: error.message });
    }
});

// Tambah tanggal kehadiran baru
router.post('/attendances', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
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
        res.status(500).json({ message: 'Error menambahkan tanggal kehadiran', error: error.message });
    }
});

// Perbarui status
router.put('/attendances', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
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
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui data kehadiran', error: error.message });
    }
});

// DELETE /teachers/attendances/:date
router.delete('/attendances', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
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
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus data kehadiran', error: error.message });
    }
});

// academic year aktif
router.get('/semesters', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const activeYear = await AcademicYear.findOne({
            where: { is_active: true },
            include: [
                {
                    model: Semester,
                    as: 'semester'
                }
            ]
        });

        if (!activeYear) {
            return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        res.json({ semesters: activeYear.semester }); // sesuai dengan alias relasi
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil semester', error: error.message });
    }
});

// title evaluasi semester
router.get('/semesters/:semester_id/evaluations', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
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
        order: [['title', 'ASC']] // Urut berdasarkan abjad judul evaluasi
      });
  
      res.json({ evaluations });
    } catch (error) {
      res.status(500).json({ message: 'Gagal mengambil evaluasi', error: error.message });
    }
});  

// Tambah title evaluasi per semester
router.post('/semesters/:semester_id/evaluations', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { semester_id } = req.params;
        const { title } = req.body;
        const userId = req.user.id;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Judul evaluasi harus diisi' });
        }

        const semester = await Semester.findOne({
            where: { id: semester_id },
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true }
            }
        });
        if (!semester) return res.status(404).json({ message: 'Semester tidak ditemukan atau tidak aktif' });

        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: semester.academic_year_id }
        });
        if (!myClass) return res.status(404).json({ message: 'Anda tidak menjadi wali kelas pada tahun ajaran ini' });

        const existingEvaluation = await Evaluation.findOne({
            where: {
                title: title.trim(),
                class_id: myClass.id,
                semester_id: semester.id
            }
        });

        if (existingEvaluation) {
            return res.status(400).json({ message: 'Evaluasi dengan judul ini sudah ada di semester ini untuk kelas Anda' });
        }

        const evaluation = await Evaluation.create({
            title: title.trim(),
            class_id: myClass.id,
            semester_id: semester.id
        });

        const studentClasses = await StudentClass.findAll({ where: { class_id: myClass.id } });

        const evaluationsToInsert = studentClasses.map(sc => ({
            evaluation_id: evaluation.id,
            student_class_id: sc.id,
            description: null
        }));

        await StudentEvaluation.bulkCreate(evaluationsToInsert);

        res.status(201).json({ message: 'Evaluasi berhasil ditambahkan ke semua siswa', evaluation });
    } catch (error) {
        console.error('Error creating evaluation:', error);
        res.status(500).json({ message: 'Gagal menambahkan evaluasi', error: error.message });
    }
});

// Edit title evaluasi
router.put('/evaluations/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { title } = req.body;
        const { id } = req.params;
        const userId = req.user.id;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Judul evaluasi harus diisi' });
        }

        // Cari evaluasi yang mau diubah
        const evaluation = await Evaluation.findByPk(id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Cari semester untuk ambil academic_year_id
        const semester = await Semester.findByPk(evaluation.semester_id);
        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        // Pastikan semester berada di tahun ajaran aktif
        const academicYear = await AcademicYear.findOne({
            where: { id: semester.academic_year_id, is_active: true }
        });
        if (!academicYear) {
            return res.status(400).json({ message: 'Tahun ajaran tidak aktif' });
        }

        // Cari kelas wali kelas
        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: academicYear.id }
        });
        if (!myClass) {
            return res.status(403).json({ message: 'Anda bukan wali kelas pada tahun ajaran aktif' });
        }

        // Pastikan evaluasi ini memang milik kelas wali tersebut
        if (evaluation.class_id !== myClass.id) {
            return res.status(403).json({ message: 'Anda tidak berhak mengedit evaluasi ini' });
        }

        // Cek apakah title baru sudah ada di semester dan kelas yang sama
        const existingEvaluation = await Evaluation.findOne({
            where: {
                title: title.trim(),
                class_id: myClass.id,
                semester_id: evaluation.semester_id,
                id: { [Op.ne]: evaluation.id } // selain evaluasi yang sedang diedit
            }
        });

        if (existingEvaluation) {
            return res.status(400).json({ message: 'Judul evaluasi ini sudah digunakan di semester dan kelas Anda' });
        }

        // Update evaluasi
        await evaluation.update({ title: title.trim() });

        res.json({ message: 'Evaluasi berhasil diperbarui', evaluation });

    } catch (error) {
        console.error('Error updating evaluation:', error);
        res.status(500).json({ message: 'Gagal mengedit evaluasi', error: error.message });
    }
});

// Hapus title evaluasi
router.delete('/evaluations/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
      const { id } = req.params;
      await Evaluation.destroy({ where: { id } });
      res.json({ message: 'Evaluasi berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghapus evaluasi', error });
    }
});

// daftar evaluasi siswa per judul di tiap semester
router.get('/evaluations/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const evaluation = await Evaluation.findByPk(id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        const semester = await Semester.findByPk(evaluation.semester_id);
        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        const academicYear = await AcademicYear.findOne({
            where: { id: semester.academic_year_id, is_active: true }
        });
        if (!academicYear) {
            return res.status(403).json({ message: 'Tahun ajaran tidak aktif' });
        }

        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: academicYear.id }
        });
        if (!myClass || evaluation.class_id !== myClass.id) {
            return res.status(403).json({ message: 'Anda tidak berhak melihat evaluasi ini' });
        }

        const studentEvaluations = await StudentEvaluation.findAll({
            where: { evaluation_id: id },
            include: {
                model: StudentClass,
                as: 'student_class',
                include: {
                    model: Student,
                    as: 'student',
                    attributes: ['name', 'nisn']
                }
            }
        });

        const result = studentEvaluations.map(se => {
            const studentData = se.student_class?.student;
            return {
                student_evaluation_id: se.id,
                name: studentData?.name || null,
                nisn: studentData?.nisn || null,
                description: se.description
            };
        });

        // Urutkan berdasarkan nama siswa (secara alfabetis)
        result.sort((a, b) => a.name.localeCompare(b.name));

        res.json(result);
    } catch (error) {
        console.error('Error fetching student evaluations:', error);
        res.status(500).json({ message: 'Gagal mengambil evaluasi siswa', error: error.message });
    }
});

// Edit deskripsi evaluasi siswa
router.put('/student-evaluations/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;
        const userId = req.user.id;

        const studentEvaluation = await StudentEvaluation.findByPk(id, {
            include: {
                model: Evaluation,
                as: 'evaluation'
            }
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: "Evaluasi siswa tidak ditemukan" });
        }

        const evaluation = studentEvaluation.evaluation;

        const semester = await Semester.findByPk(evaluation.semester_id);
        const academicYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
        const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: academicYear.id } });

        if (!myClass || evaluation.class_id !== myClass.id) {
            return res.status(403).json({ message: 'Anda tidak berhak mengubah evaluasi ini' });
        }

        studentEvaluation.description = description;
        await studentEvaluation.save();

        res.json({ message: "Deskripsi evaluasi berhasil diperbarui" });
    } catch (error) {
        console.error('Error updating evaluation description:', error);
        res.status(500).json({ message: 'Gagal memperbarui deskripsi evaluasi', error: error.message });
    }
});

// *** GRADES ***
// list mapel sesuai jadwal
router.get('/grades/subjects', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        // 1. Cari tahun ajaran aktif
        const activeAcademicYear = await AcademicYear.findOne({ where: { is_active: true } });

        if (!activeAcademicYear) {
            return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        // 2. Cari kelas wali berdasarkan user.id dan tahun ajaran aktif
        const teacherClass = await Class.findOne({
            where: {
                teacher_id: req.user.id,
                academic_year_id: activeAcademicYear.id
            }
        });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar di tahun ajaran aktif' });
        }

        // 3. Ambil jadwal kelas beserta mata pelajaran
        const schedules = await Schedule.findAll({
            where: { class_id: teacherClass.id },
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                }
            ],
            attributes: ['subject_id']
        });

        // 4. Ambil daftar mata pelajaran unik
        const uniqueSubjects = [];
        const subjectSet = new Set();

        schedules.forEach(schedule => {
            if (!subjectSet.has(schedule.subject.id)) {
                uniqueSubjects.push({
                    subject_id: schedule.subject.id,
                    subject_name: schedule.subject.name
                });
                subjectSet.add(schedule.subject.id);
            }
        });

        // 5. Urutkan berdasarkan nama mata pelajaran
        uniqueSubjects.sort((a, b) => a.subject_name.localeCompare(b.subject_name));

        res.json(uniqueSubjects);
    } catch (error) {
        console.error("Error fetching subjects for academic grades:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// kategori penilaian setiap mapel
router.get('/grades/:subject_id/:semester_id/categories', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
      try {
        const { subject_id, semester_id } = req.params;
  
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
        if (!teacherClass) {
          return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }
  
        const categories = await GradeCategory.findAll({
          where: {
            class_id: teacherClass.id,
            subject_id,
            semester_id
          },
          attributes: ['id', 'name']
        });
  
        res.json(categories);
      } catch (error) {
        console.error('Error fetching grade categories:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
);  

// tambah kategori
router.post('/grades/:subject_id/:semester_id/categories', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
      try {
        const { subject_id, semester_id } = req.params;
        const { name } = req.body;
  
        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
        if (!teacherClass) {
          return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }
  
        const classId = teacherClass.id;
  
        // Cek apakah kategori sudah ada untuk kombinasi kelas, mata pelajaran, semester, dan nama
        const existingCategory = await GradeCategory.findOne({
          where: {
            subject_id,
            class_id: classId,
            semester_id,
            name
          }
        });
  
        if (existingCategory) {
          return res.status(400).json({ message: 'Kategori sudah ada untuk mata pelajaran dan semester ini' });
        }
  
        // Jika belum ada, buat kategori baru
        const newCategory = await GradeCategory.create({
          subject_id,
          class_id: classId,
          semester_id,
          name
        });
  
        res.status(201).json(newCategory);
      } catch (error) {
        console.error('Error creating grade category:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
);

// Edit kategori penilaian
router.put('/grades/categories/:category_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { category_id } = req.params;
        const { name } = req.body;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Cek apakah kategori ada
        const categoryExists = await GradeCategory.findOne({ where: { id: category_id } });

        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Cek apakah nama baru sudah digunakan dalam kelas dan mata pelajaran yang sama
        const duplicateCategory = await GradeCategory.findOne({
            where: { name, class_id: classId, subject_id: categoryExists.subject_id, id: { [Op.ne]: category_id } }
        });

        if (duplicateCategory) {
            return res.status(400).json({ message: 'Category name already exists for this class and subject' });
        }

        // Update kategori
        await GradeCategory.update({ name }, { where: { id: category_id } });

        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Hapus kategori penilaian
router.delete('/grades/categories/:category_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { category_id } = req.params;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Cek apakah kategori ada
        const categoryExists = await GradeCategory.findOne({ where: { id: category_id, class_id: classId } });

        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Hapus semua detail penilaian yang terkait
        await GradeDetail.destroy({ where: { grade_category_id: category_id } });

        // Hapus kategori penilaian
        await GradeCategory.destroy({ where: { id: category_id } });

        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// get detail penilaian dalam kategori
router.get('/grades/categories/:category_id/details', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { category_id } = req.params;

        const category = await GradeCategory.findOne({ where: { id: category_id } });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || category.class_id !== teacherClass.id)
            return res.status(403).json({ message: 'Access denied to this category' });

        const details = await GradeDetail.findAll({
            where: { grade_category_id: category_id },
            order: [['name', 'ASC']]
        });

        res.json(details);
    } catch (e) {
        res.status(500).json({ message: 'Server error', error: e.message });
    }
});

// tambah detail penilaian (macam-macam)
router.post('/grades/categories/:category_id/details', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { category_id } = req.params;
        const { name, date } = req.body;

        // 1. Validasi kategori penilaian
        const category = await GradeCategory.findOne({ where: { id: category_id } });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // 2. Ambil kelas wali berdasarkan user login
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || teacherClass.id !== category.class_id) {
            return res.status(403).json({ message: 'Access denied to this category' });
        }

        // 3. Cek apakah detail penilaian dengan nama yang sama sudah ada
        const existing = await GradeDetail.findOne({
            where: {
                grade_category_id: category_id,
                name,
            },
        });
        if (existing) {
            return res.status(400).json({ message: 'Detail already exists in this category' });
        }

        // 4. Buat GradeDetail baru
        const newDetail = await GradeDetail.create({
            grade_category_id: category_id,
            name,
            date,
        });

        // 5. Ambil semua siswa di kelas wali
        const studentClasses = await StudentClass.findAll({
            where: { class_id: teacherClass.id }
        });

        // 6. Buat nilai kosong (null) untuk tiap siswa
        const studentGrades = studentClasses.map(sc => ({
            student_class_id: sc.id,
            grade_detail_id: newDetail.id,
            score: null
        }));
        await StudentGrade.bulkCreate(studentGrades);

        return res.status(201).json({ message: 'Detail created and grades initialized', newDetail });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: 'Server error',
            error: e.message
        });
    }
});

// Edit detail penilaian (macam-macam)
router.put('/grades/details/:detail_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { detail_id } = req.params;
        const { name, date } = req.body;

        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: {
                model: GradeCategory,
                as: 'grade_category'
            }
        });

        if (!gradeDetail) {
            return res.status(404).json({ message: 'Detail not found' });
        }

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class_id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Cek duplikat hanya jika 'name' diubah
        if (name && name !== gradeDetail.name) {
            const duplicate = await GradeDetail.findOne({
                where: {
                    grade_category_id: gradeDetail.grade_category_id,
                    name,
                    id: { [Op.ne]: detail_id }
                }
            });
            if (duplicate) {
                return res.status(400).json({ message: 'Duplicate detail name' });
            }
        }

        // Update name dan/atau date
        await gradeDetail.update({
            name: name || gradeDetail.name,
            date: date || gradeDetail.date
        });

        res.json({ message: 'Detail category updated' });
    } catch (e) {
        console.error(e); // Debug
        res.status(500).json({ message: 'Server error', error: e.message });
    }
});

// Hapus detail penilaian (macam-macam)
router.delete('/grades/details/:detail_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { detail_id } = req.params;

        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: { model: GradeCategory, as: 'grade_category' }
        });

        if (!gradeDetail) return res.status(404).json({ message: 'Detail not found' });

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class_id !== teacherClass.id)
            return res.status(403).json({ message: 'Access denied' });

        await StudentGrade.destroy({ where: { grade_detail_id: detail_id } });
        await GradeDetail.destroy({ where: { id: detail_id } });

        res.json({ message: 'Detail category deleted' });
    } catch (e) {
        res.status(500).json({ message: 'Server error', error: e.message });
    }
});

// Ambil skor siswa untuk suatu grade detail
router.get('/grades/details/:detail_id/students', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { detail_id } = req.params;

        // 1. Ambil detail penilaian dengan relasi kategori dan kelas
        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: {
                model: GradeCategory,
                as: 'grade_category',
                include: {
                    model: Class,
                    as: 'class'
                }
            }
        });

        if (!gradeDetail) return res.status(404).json({ message: 'Detail not found' });

        // 2. Pastikan wali kelas hanya bisa akses kelasnya
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class.id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 3. Ambil semua siswa dan skor (null jika belum dinilai), urut berdasarkan nama siswa
        const studentGrades = await StudentGrade.findAll({
            where: { grade_detail_id: detail_id },
            include: [
                {
                    model: StudentClass,
                    as: 'student_class',
                    include: {
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'name']
                    }
                }
            ],
            order: [[{ model: StudentClass, as: 'student_class' }, { model: Student, as: 'student' }, 'name', 'ASC']]
        });

        const result = studentGrades.map(entry => ({
            student_grade_id: entry.id,
            student_id: entry.student_class?.student?.id,
            student_name: entry.student_class?.student?.name,
            score: entry.score
        }));

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error', error: e.message });
    }
});

// edit skor
router.patch('/grades/students/:student_grade_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { student_grade_id } = req.params;
        const { score, student_id } = req.body;

        if (score === undefined || score === null || isNaN(score)) {
            return res.status(400).json({ message: 'Invalid score' });
        }

        const studentGrade = await StudentGrade.findOne({
            where: { id: student_grade_id },
            include: {
                model: GradeDetail,
                as: 'grade_detail',
                include: {
                    model: GradeCategory,
                    as: 'grade_category',
                    include: {
                        model: Class,
                        as: 'class'
                    }
                }
            }
        });

        if (!studentGrade) {
            return res.status(404).json({ message: 'Student grade not found' });
        }

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || studentGrade.grade_detail.grade_category.class.id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Isi student_class_id jika belum ada
        if (!studentGrade.student_class_id) {
            if (!student_id) {
                return res.status(400).json({ message: 'student_id dibutuhkan untuk menyimpan student_class_id' });
            }

            const studentClass = await StudentClass.findOne({
                where: {
                    class_id: teacherClass.id,
                    student_id: student_id
                }
            });

            if (!studentClass) {
                return res.status(400).json({ message: 'StudentClass tidak ditemukan untuk siswa tersebut di kelas ini' });
            }

            studentGrade.student_class_id = studentClass.id;
        }

        studentGrade.score = score;
        await studentGrade.save(); // Penting: menyimpan semua perubahan

        return res.json({ message: 'Score updated successfully' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error', error: e.message });
    }
});

module.exports = router