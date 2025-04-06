const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Student, Evaluation, Attendance, StudentEvaluation, Schedule, Subject, GradeCategory, GradeDetail, StudentGrade, Class } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

router.get('/my-class', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        // Cari kelas wali kelas yang login
        const teacherClass = await Class.findOne({
            where: { teacher_id: req.user.id },
            include: [
                { model: Student, as: 'students', attributes: ['id', 'name', 'nisn', 'birth_date'] }
            ]
        });

        if (!teacherClass) {
            return res.status(404).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        res.json({
            class_id: teacherClass.id,
            class_name: teacherClass.name,
            grade_level: teacherClass.grade_level,
            students: teacherClass.students
        });
    } catch (error) {
        console.error("Error fetching class for teacher:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** ATTENDANCES ***
router.get('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.params;
        const teacherClass = await Class.findOne({
            where: { teacher_id: req.user.id }
        });

        // Pastikan wali kelas memiliki class_id yang valid
        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Pastikan wali kelas memilih tanggal
        if (!date) {
            return res.status(400).json({ message: 'Tanggal harus disertakan' });
        }

        // Mencari daftar kehadiran siswa yang berasal dari kelas wali kelas tersebut
        const attendances = await Attendance.findAll({
            where: { date },
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'name'],
                    where: { class_id: teacherClass.id } // Filter berdasarkan kelas wali kelas
                }
            ]
        });

        if (attendances.length === 0) {
            return res.status(404).json({ message: 'Tidak ada data kehadiran untuk tanggal ini' });
        }

        res.json(attendances);
    } catch (error) {
        console.error('Error fetching attendance data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// POST: Menambahkan data kehadiran berdasarkan tanggal
router.post('/attendances', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.body;
        // Get class information of the logged-in teacher
        const teacherClass = await Class.findOne({
            where: { teacher_id: req.user.id }
        });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        if (!date) {
            return res.status(400).json({ message: 'Tanggal harus disertakan' });
        }

        // Get all students from the teacher's class
        const students = await Student.findAll({
            where: { class_id: teacherClass.id },
            attributes: ['id']
        });

        if (students.length === 0) {
            return res.status(404).json({ message: 'Tidak ada siswa di kelas Anda' });
        }

        // Prepare attendance records for all students
        const attendanceRecords = students.map(student => ({
            student_id: student.id,
            class_id: teacherClass.id, // Ensure the correct class_id is used
            date,
            status: 'Alpha'
        }));
        console.log(attendanceRecords);
        // Create attendance records in bulk
        await Attendance.bulkCreate(attendanceRecords);

        res.status(201).json({ message: 'Data kehadiran berhasil ditambahkan', data: attendanceRecords });
    } catch (error) {
        console.error('Error adding attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT: Memperbarui status kehadiran siswa dalam kelas wali kelas
router.put('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.params;
        const { attendances } = req.body; // Array dari student_id dan status

        if (!attendances || !Array.isArray(attendances) || attendances.length === 0) {
            return res.status(400).json({ message: 'Daftar kehadiran harus disertakan dalam format array' });
        }

        // Cari kelas wali kelas berdasarkan teacher_id
        const teacherClass = await Class.findOne({
            where: { teacher_id: req.user.id }
        });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Ambil semua student_id dalam kelas wali kelas
        const validStudentIds = await Student.findAll({
            where: { class_id: teacherClass.id },
            attributes: ['id']
        }).then(students => students.map(s => s.id));

        // Filter attendances untuk memastikan hanya siswa dari kelas wali kelas yang diupdate
        const validAttendances = attendances.filter(a => validStudentIds.includes(a.student_id));

        if (validAttendances.length === 0) {
            return res.status(403).json({ message: 'Tidak ada siswa yang valid untuk diperbarui' });
        }

        // Bulk update attendance
        const updates = validAttendances.map(a => ({
            student_id: a.student_id,
            date: date,
            class_id: teacherClass.id,
            status: a.status
        }));

        await Promise.all(updates.map(attendance => 
            Attendance.update(
                { status: attendance.status },
                { where: { student_id: attendance.student_id, date: attendance.date, class_id: attendance.class_id } }
            )
        ));

        res.json({ message: 'Status kehadiran berhasil diperbarui untuk beberapa siswa' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** SCHEDULE ***
router.get('/schedule', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { day } = req.query;  // Ambil query parameter "day"

        // Cari class_id dari wali kelas berdasarkan teacher_id
        const teacherClass = await Class.findOne({
            where: { teacher_id: req.user.id }
        });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Buat kondisi filter untuk class_id wali kelas
        const whereCondition = { class_id: teacherClass.id };

        // Jika ada filter "day", tambahkan ke kondisi where
        if (day) {
            whereCondition.day = { [Op.eq]: day };  // Case-sensitive search (bisa diganti Op.iLike untuk case-insensitive jika pakai PostgreSQL)
        }

        const schedule = await Schedule.findAll({
            where: whereCondition,
            attributes: ['id', 'subject_id', 'day', 'start_time', 'end_time'],
            include: [{ model: Subject, as: "subject", attributes: ['name'] }]
        });

        if (schedule.length === 0) {
            return res.status(404).json({ message: 'Tidak ada jadwal tersedia' });
        }

        res.json(schedule);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET: Ambil title evaluasi untuk wali kelas
router.get('/evaluations', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        // Ambil class_id wali kelas berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Ambil semua evaluasi berdasarkan class_id
        const evaluations = await Evaluation.findAll({
            where: { class_id: teacherClass.id },
            attributes: ['id', 'title']
        });

        if (evaluations.length === 0) {
            return res.status(404).json({ message: 'Tidak ada evaluasi tersedia' });
        }

        res.json(evaluations);
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// POST: Menambahkan evaluasi baru
router.post('/evaluations', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { title } = req.body;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Buat evaluasi baru dengan class_id dari teacher_id
        const newEvaluation = await Evaluation.create({
            title,
            class_id: teacherClass.id // Pastikan class_id tidak null
        });

        // Ambil semua siswa yang terdaftar di kelas wali kelas
        const students = await Student.findAll({
            where: { class_id: teacherClass.id }
        });

        // Untuk setiap siswa, tambahkan entry baru di StudentEvaluation dengan description null
        await Promise.all(students.map(student =>
            StudentEvaluation.create({
                evaluation_id: newEvaluation.id,
                student_id: student.id,
                description: null // Set description sebagai null pada awalnya
            })
        ));

        res.status(201).json({ message: 'Evaluasi berhasil ditambahkan', evaluation: newEvaluation });
    } catch (error) {
        console.error('Error creating evaluation:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// PUT: Edit title evaluasi
router.put('/evaluations/:id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Cek apakah evaluasi ada dan hanya bisa diedit oleh wali kelasnya
        const evaluation = await Evaluation.findOne({
            where: { id, class_id: teacherClass.id }
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Update evaluasi
        await evaluation.update({ title });

        res.json({ message: 'Evaluasi berhasil diperbarui', evaluation });
    } catch (error) {
        console.error('Error updating evaluation:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui evaluasi', error: error.message });
    }
});

// DELETE: Hapus evaluasi
router.delete('/evaluations/:id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Cek apakah evaluasi ada dan hanya bisa dihapus oleh wali kelasnya
        const evaluation = await Evaluation.findOne({
            where: { id, class_id: teacherClass.id }
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Hapus evaluasi
        await evaluation.destroy();

        res.json({ message: 'Evaluasi berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting evaluation:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus evaluasi', error: error.message });
    }
});

// GET: Menampilkan daftar siswa dan deskripsi evaluasi
router.get('/evaluations/:id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah evaluasi ada
        const evaluation = await Evaluation.findByPk(id);

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Ambil siswa-siswa yang terkait dengan evaluasi ini
        const evaluationDetails = await StudentEvaluation.findAll({
            where: { evaluation_id: id },
            include: {
                model: Student,
                as: 'student',
                attributes: ['id', 'name'], // Hanya ambil id dan nama siswa
            }
        });

        // Format data yang akan dikirimkan
        const result = evaluationDetails.map(detail => ({
            student_id: detail.student_id,
            student_name: detail.student.name,
            description: detail.description || null // Deskripsi evaluasi, jika belum diupdate tampilkan null
        }));

        res.json({ evaluation: evaluation.title, students: result });
    } catch (error) {
        console.error('Error fetching evaluation details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** MENGAMBIL DETAIL EVALUASI DARI SEORANG SISWA ***
router.get('/evaluations/:evaluation_id/students/:student_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id, student_id } = req.params;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Cek apakah evaluasi ada dan milik kelas yang diajar
        const evaluation = await Evaluation.findOne({ 
            where: { id: evaluation_id, class_id: teacherClass.id }
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan atau bukan milik kelas Anda' });
        }

        // Cek apakah evaluasi siswa ada
        const studentEvaluation = await StudentEvaluation.findOne({
            where: { evaluation_id, student_id },
            include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }],
            attributes: ['id', 'description']
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi siswa tidak ditemukan' });
        }

        res.json(studentEvaluation);
    } catch (error) {
        console.error('Error fetching student evaluation:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** MEMPERBARUI DESKRIPSI EVALUASI SISWA ***
router.put('/evaluations/:evaluation_id/students/:student_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id, student_id } = req.params;
        const { description } = req.body;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        // Cek apakah evaluasi ada dan milik kelas yang diajar
        const evaluation = await Evaluation.findOne({ 
            where: { id: evaluation_id, class_id: teacherClass.id }
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan atau bukan milik kelas Anda' });
        }

        // Cek apakah evaluasi siswa ada
        const studentEvaluation = await StudentEvaluation.findOne({
            where: { evaluation_id, student_id }
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi siswa tidak ditemukan' });
        }

        // Update deskripsi evaluasi siswa
        await studentEvaluation.update({ description });

        res.json({ message: 'Evaluasi siswa berhasil diperbarui' });
    } catch (error) {
        console.error('Error updating student evaluation:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
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