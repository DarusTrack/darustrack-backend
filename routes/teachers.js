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
        const userId = req.user.id; // Mendapatkan ID wali kelas dari user yang sedang login
    
         // 1. Cari tahun ajaran aktif
        const activeYear = await AcademicYear.findOne({
            where: { is_active: true }
        });
        if (!activeYear) {
            return res
            .status(404)
            .json({ message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        // 2. Cari kelas yang diampu wali kelas pada tahun ajaran aktif
        const myClass = await Class.findOne({
            where: {
            teacher_id: userId,
            academic_year_id: activeYear.id
            }
        });
        if (!myClass) {
            return res.status(404).json({
            message:
                'Anda tidak mengampu kelas apapun di tahun ajaran aktif ini'
            });
        }

        // 3. Ambil jadwal untuk kelas tersebut
        const schedules = await Schedule.findAll({
            where: { class_id: myClass.id },
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

        // 4. Format output
        const output = schedules.map(s => ({
            classId: myClass.id,
            className: myClass.name,
            subjectId: s.subject_id,
            subjectName: s.subject.name,
            day: s.day,
            startTime: s.start_time,
            endTime: s.end_time
        }));

        res.json(output);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil jadwal kelas', error: error.message });
    }
});

// Mendapatkan daftar kehadiran berdasarkan tanggal
router.get('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.params;

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
                    where: { class_id: classData.id }, // Filter hanya untuk kelas ini
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

        // Format responsenya
        const attendanceData = attendances.map(att => ({
            studentName: att.student_class.student.name,
            status: att.status,
            date: att.date
        }));

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
router.put('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.params; // Format diharapkan: 'YYYY-MM-DD'
        const { attendanceUpdates } = req.body; // Array of { student_id, status }

        // Pastikan attendanceUpdates berupa array dan tidak kosong
        if (!Array.isArray(attendanceUpdates) || attendanceUpdates.length === 0) {
            return res.status(400).json({ message: 'Data update kehadiran tidak valid' });
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

        // Ambil semua student_class_id untuk kelas yang dikelola wali kelas
        const studentClasses = await StudentClass.findAll({
            where: { class_id: classData.id },
            attributes: ['id', 'student_id'],
        });

        const studentClassIds = studentClasses.map(sc => sc.id);
        const studentIds = studentClasses.map(sc => sc.student_id);

        // Validasi apakah semua siswa yang diupdate berada di kelas yang benar
        const invalidUpdates = attendanceUpdates.filter(update => !studentIds.includes(update.student_id));
        if (invalidUpdates.length > 0) {
            return res.status(400).json({ message: 'Beberapa siswa tidak terdaftar di kelas ini', invalidUpdates });
        }

        // Memperbarui status kehadiran untuk setiap siswa tanpa duplikasi
        const updatedAttendances = [];
        for (const update of attendanceUpdates) {
            // Cari attendance yang sudah ada berdasarkan student_class_id, semester_id, dan date
            const studentClassId = studentClassIds.find(id => studentClasses.find(sc => sc.student_id === update.student_id).id === id);
            const existingAttendance = await Attendance.findOne({
                where: {
                    student_class_id: studentClassId,
                    semester_id: activeSemester.id,
                    date: date,
                },
                attributes: ['id', 'student_class_id', 'semester_id', 'date', 'status'], // sesuaikan dengan atribut yang ada
            });            

            if (existingAttendance) {
                // Jika data kehadiran sudah ada, update statusnya
                existingAttendance.status = update.status;
                await existingAttendance.save();
                updatedAttendances.push(existingAttendance);
            } else {
                // Jika data kehadiran belum ada, buat data baru
                const newAttendance = await Attendance.create({
                    student_class_id: studentClassId,
                    semester_id: activeSemester.id,
                    date: date,
                    status: update.status,
                });
                updatedAttendances.push(newAttendance);
            }
        }

        res.json({ message: `${updatedAttendances.length} data kehadiran berhasil diperbarui`, updatedAttendances });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui data kehadiran', error: error.message });
    }
});

// DELETE /teachers/attendances/:date
router.delete('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.params; // Format diharapkan: 'YYYY-MM-DD'

        // Cari semester aktif
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

        // Ambil semua StudentClass id di kelas tersebut
        const studentClasses = await StudentClass.findAll({
            where: { class_id: classData.id },
            attributes: ['id'],
        });

        const studentClassIds = studentClasses.map(sc => sc.id);

        // Hapus kehadiran yang sesuai studentClassId, semesterId, dan tanggal
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

router.get('/evaluation', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const userId = req.user.id;

        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan.' });

        const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: activeYear.id } });
        if (!myClass) return res.status(404).json({ message: 'Kelas tidak ditemukan.' });

        const evaluations = await Evaluation.findAll({
            where: { class_id: myClass.id },
            attributes: ['id', 'title'],
            group: ['title']  // Group by title, karena 2 semester
        });

        res.json({ evaluations });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan.', error: error.message });
    }
});

// Tambah title evaluasi
router.post('/evaluation', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const userId = req.user.id;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Judul evaluasi wajib diisi.' });
        }

        // Cari tahun ajaran aktif
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) {
            return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan.' });
        }

        // Cari kelas wali kelas di tahun ajaran aktif
        const myClass = await Class.findOne({
            where: {
                teacher_id: userId,
                academic_year_id: activeYear.id
            }
        });
        if (!myClass) {
            return res.status(404).json({ message: 'Kelas untuk wali kelas ini tidak ditemukan.' });
        }

        // Cari semester Ganjil
        const semesterGanjil = await Semester.findOne({
            where: {
                academic_year_id: activeYear.id,
                name: 'Ganjil'
            }
        });
        if (!semesterGanjil) {
            return res.status(404).json({ message: 'Semester Ganjil tidak ditemukan.' });
        }

        // Cari semester Genap
        const semesterGenap = await Semester.findOne({
            where: {
                academic_year_id: activeYear.id,
                name: 'Genap'
            }
        });
        if (!semesterGenap) {
            return res.status(404).json({ message: 'Semester Genap tidak ditemukan.' });
        }

        // Buat evaluasi untuk semester Ganjil dan Genap
        const [evaluationGanjil, evaluationGenap] = await Promise.all([
            Evaluation.create({
                title: title,
                class_id: myClass.id,
                semester_id: semesterGanjil.id
            }),
            Evaluation.create({
                title: title,
                class_id: myClass.id,
                semester_id: semesterGenap.id
            })
        ]);

        // Tambahkan student evaluations
        const students = await StudentClass.findAll({ where: { class_id: myClass.id } });
        const studentEvaluations = students.map(student => ({
            evaluation_id: evaluationGanjil.id,
            student_class_id: student.id
        }));
        await StudentEvaluation.bulkCreate(studentEvaluations);

        res.status(201).json({
            message: 'Evaluasi berhasil dibuat untuk semester Ganjil dan Genap.',
            evaluations: {
                ganjil: evaluationGanjil,
                genap: evaluationGenap
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat membuat evaluasi.', error: error.message });
    }
});

// Edit title evaluasi
router.put('/evaluation/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const userId = req.user.id;

        if (!title) return res.status(400).json({ message: 'Judul evaluasi wajib diisi.' });

        const evaluation = await Evaluation.findByPk(id, { include: { model: Class, as: 'class' } });
        if (!evaluation) return res.status(404).json({ message: 'Evaluasi tidak ditemukan.' });

        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear || evaluation.class.academic_year_id !== activeYear.id) {
            return res.status(403).json({ message: 'Tahun ajaran tidak aktif.' });
        }

        if (evaluation.class.teacher_id !== userId) {
            return res.status(403).json({ message: 'Anda tidak berhak mengedit evaluasi ini.' });
        }

        // Update semua evaluasi (Ganjil dan Genap)
        await Evaluation.update({ title }, {
            where: {
                title: evaluation.title,
                class_id: evaluation.class_id
            }
        });

        res.json({ message: 'Judul evaluasi berhasil diperbarui untuk kedua semester.' });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan.', error: error.message });
    }
});

// Hapus title evaluasi
router.delete('/evaluation/:id', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const evaluation = await Evaluation.findByPk(id, { include: { model: Class, as: 'class' } });
        if (!evaluation) return res.status(404).json({ message: 'Evaluasi tidak ditemukan.' });

        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear || evaluation.class.academic_year_id !== activeYear.id) {
            return res.status(403).json({ message: 'Tidak dapat menghapus evaluasi di tahun ajaran non-aktif.' });
        }

        if (evaluation.class.teacher_id !== userId) {
            return res.status(403).json({ message: 'Anda bukan wali kelas yang berhak menghapus evaluasi ini.' });
        }

        await StudentEvaluation.destroy({ where: { evaluation_id: evaluation.id } });

        // Hapus kedua semester berdasarkan title dan class_id
        await Evaluation.destroy({
            where: {
                title: evaluation.title,
                class_id: evaluation.class_id
            }
        });

        res.json({ message: 'Evaluasi di kedua semester berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan.', error: error.message });
    }
});

// daftar evaluasi siswa per judul di tiap semester
router.get('/evaluation/:title', async (req, res) => {
    const { title } = req.params;
    const { semester } = req.query;

    try {
        // Mengambil data evaluation berdasarkan title dan semester
        const evaluations = await Evaluation.findAll({
            where: {
                title: title,
                semester: semester
            },
            include: [
                {
                    model: StudentEvaluation,
                    as: 'student_evaluations',
                    include: [
                        {
                            model: StudentClass,
                            as: 'student_class',
                            include: [Student]  // Menyertakan data Student di dalam StudentClass
                        }
                    ]
                }
            ]
        });

        // Mengecek apakah data evaluation ditemukan
        if (!evaluations || evaluations.length === 0) {
            return res.status(404).json({ message: 'Evaluations not found for the given title and semester.' });
        }

        // Mapping data untuk memastikan student_class tersedia
        const responseData = evaluations.map((evaluation) => {
            return {
                title: evaluation.title,
                semester: evaluation.semester,
                student_evaluations: evaluation.student_evaluations.map((se) => {
                    // Pastikan student_class ada sebelum mengakses properti
                    if (se.student_class) {
                        return {
                            student_id: se.student_class.student ? se.student_class.student.id : null,
                            student_name: se.student_class.student ? se.student_class.student.name : 'Nama Tidak Tersedia',
                            description: se.description || 'Deskripsi Tidak Ada',
                        };
                    } else {
                        return {
                            student_id: null,
                            student_name: 'Student Class Tidak Ditemukan',
                            description: se.description || 'Deskripsi Tidak Ada',
                        };
                    }
                })
            };
        });

        // Mengirimkan data response
        res.status(200).json(responseData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Edit deskripsi evaluasi siswa
router.put('/evaluation/:evaluationId/student/:studentId', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { evaluationId, studentId } = req.params;
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ message: 'Deskripsi evaluasi wajib diisi.' });
        }

        const evaluation = await Evaluation.findByPk(evaluationId);
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan.' });
        }

        const studentEvaluation = await StudentEvaluation.findOne({
            where: {
                evaluation_id: evaluationId,
                student_class_id: studentId
            }
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi siswa tidak ditemukan.' });
        }

        // Update deskripsi evaluasi siswa
        studentEvaluation.description = description;
        await studentEvaluation.save();

        res.status(200).json({ message: 'Evaluasi siswa berhasil diperbarui.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui evaluasi.', error: error.message });
    }
});

// *** GRADES ***
// list mapel sesuai jadwal
router.get('/grades', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const schedules = await Schedule.findAll({
            where: { class_id: teacherClass.id },
            include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
            attributes: ['subject_id']
        });

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

        res.json(uniqueSubjects);
    } catch (error) {
        console.error("Error fetching grades:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// kategori penilaian setiap mapel
router.get('/grades/:subject_id/categories', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { subject_id } = req.params;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Periksa apakah classId valid
        if (!classId) {
            return res.status(400).json({ message: 'class_id tidak ditemukan untuk wali kelas ini' });
        }

        const categories = await GradeCategory.findAll({
            where: { subject_id, class_id: classId }, // Pastikan class_id ada
            attributes: ['id', 'name']
        });

        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// tambah kategori
router.post('/grades/:subject_id/categories', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { subject_id } = req.params;
        const { name } = req.body;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Cek apakah kategori dengan nama yang sama sudah ada untuk kelas dan mata pelajaran ini
        const existingCategory = await GradeCategory.findOne({
            where: { subject_id, class_id: classId, name }
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists for this class and subject' });
        }

        // Jika belum ada, buat kategori baru
        const newCategory = await GradeCategory.create({ subject_id, class_id: classId, name });

        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

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
        const details = await GradeDetail.findAll({
            where: { grade_category_id: category_id }
        });

        res.json(details);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// tambah detail penilaian (macam-macam)
router.post('/grades/categories/:category_id/details', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { category_id } = req.params;
        const { name, date } = req.body;

        // 🔍 Cek apakah kategori ada di database
        const categoryExists = await GradeCategory.findOne({ where: { id: category_id } });

        if (!categoryExists) {
            return res.status(400).json({ message: 'Grade category not found' });
        }

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Cek apakah detail penilaian dengan nama yang sama sudah ada dalam kategori ini
        const existingDetail = await GradeDetail.findOne({
            where: { grade_category_id: category_id, name }
        });

        if (existingDetail) {
            return res.status(400).json({ message: 'Detail name already exists in this category' });
        }

        // Buat detail penilaian baru
        const newDetail = await GradeDetail.create({ grade_category_id: category_id, name, date });

        // Ambil daftar siswa dalam kelas untuk otomatis menambahkan skor default (null)
        const students = await Student.findAll({
            where: { class_id: classId },
            attributes: ['id']
        });

        await Promise.all(students.map(student => 
            StudentGrade.create({ grade_detail_id: newDetail.id, student_id: student.id, score: null })
        ));

        res.status(201).json(newDetail);
    } catch (error) {
        console.error("Error adding grade detail:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Edit detail penilaian (macam-macam)
router.put('/grades/details/:detail_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { detail_id } = req.params;
        const { name, date } = req.body;
        const user = req.user;

        // Ambil data wali kelas beserta kelasnya
        const waliKelas = await User.findOne({
            where: { id: user.id },
            include: {
                model: Class,
                as: 'class'
            }
        });

        if (!waliKelas || !waliKelas.class) {
            return res.status(403).json({ message: 'User is not assigned to any class' });
        }

        // Cek apakah grade detail milik kelas wali kelas (melalui grade category)
        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: {
                model: GradeCategory,
                as: 'grade_category',
                where: {
                    class_id: waliKelas.class.id
                }
            }
        });

        if (!gradeDetail) {
            return res.status(404).json({ message: 'Grade detail not found for this class' });
        }

        // Cek duplikat nama dalam kategori yang sama
        const duplicate = await GradeDetail.findOne({
            where: {
                grade_category_id: gradeDetail.grade_category_id,
                name,
                id: { [Op.ne]: detail_id }
            }
        });

        if (duplicate) {
            return res.status(400).json({ message: 'Detail name already exists in this category' });
        }

        // Update
        await GradeDetail.update({ name, date }, { where: { id: detail_id } });

        res.status(200).json({ message: 'Grade detail updated successfully' });
    } catch (error) {
        console.error("Error updating grade detail:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Hapus detail penilaian (macam-macam)
router.delete('/grades/details/:detail_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { detail_id } = req.params;
        const user = req.user;

        // Ambil data wali kelas beserta kelasnya
        const waliKelas = await User.findOne({
            where: { id: user.id },
            include: {
                model: Class,
                as: 'class'
            }
        });

        if (!waliKelas || !waliKelas.class) {
            return res.status(403).json({ message: 'User is not assigned to any class' });
        }

        // Pastikan grade detail berasal dari kategori yang dimiliki kelas wali kelas
        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: {
                model: GradeCategory,
                as: 'grade_category',
                where: {
                    class_id: waliKelas.class.id
                }
            }
        });

        if (!gradeDetail) {
            return res.status(404).json({ message: 'Grade detail not found for this class' });
        }

        // Hapus semua nilai siswa terkait
        await StudentGrade.destroy({ where: { grade_detail_id: detail_id } });

        // Hapus detail penilaian
        await GradeDetail.destroy({ where: { id: detail_id } });

        res.status(200).json({ message: 'Grade detail deleted successfully' });
    } catch (error) {
        console.error("Error deleting grade detail:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// skor siswa
router.get('/grades/details/:detail_id/students', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { detail_id } = req.params;
        
        const scores = await StudentGrade.findAll({
            where: { grade_detail_id: detail_id },
            include: [{ model: Student, as: 'students', attributes: ['id', 'name'] }]
        });

        res.json(scores);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// edit skor
router.put('/grades/students/:student_grade_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { student_grade_id } = req.params;
        const { score } = req.body;

        await StudentGrade.update({ score }, { where: { id: student_grade_id } });

        res.json({ message: 'Score updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router