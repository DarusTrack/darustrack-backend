const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Student, Evaluation, Attendance, Grade, StudentEvaluation, Schedule, Subject, GradeCategory, GradeDetail, StudentGrade } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Route untuk mendapatkan data siswa dalam kelas wali kelas
router.get('/students', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const students = await Student.findAll({
            where: { class_id: req.user.class_id },
            attributes: ['id', 'name', 'nisn', 'birth_date']
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** ATTENDANCES ***
router.get('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.params;
        const teacherId = req.user.class_id; // Ambil class_id dari wali kelas yang login

        // Pastikan wali kelas memiliki class_id yang valid
        if (!teacherId) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini' });
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
                    where: { class_id: teacherId } // Filter berdasarkan kelas wali kelas
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
        const waliKelasClassId = req.user.class_id;

        if (!waliKelasClassId) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini' });
        }

        if (!date) {
            return res.status(400).json({ message: 'Tanggal harus disertakan' });
        }

        // Ambil semua siswa dalam kelas wali kelas
        const students = await Student.findAll({
            where: { class_id: waliKelasClassId },
            attributes: ['id']
        });

        if (students.length === 0) {
            return res.status(404).json({ message: 'Tidak ada siswa di kelas Anda' });
        }

        // Membuat entri kehadiran untuk setiap siswa
        const attendanceRecords = students.map(student => ({
            student_id: student.id,
            class_id: waliKelasClassId,
            date,
            status: 'null'
        }));

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
        const { student_id, status } = req.body;
        const waliKelasClassId = req.user.class_id;

        if (!waliKelasClassId) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini' });
        }

        if (!date || !status) {
            return res.status(400).json({ message: 'Tanggal dan status harus disertakan' });
        }

        // Cek apakah siswa berasal dari kelas wali kelas tersebut
        const student = await Student.findOne({
            where: { id: student_id, class_id: waliKelasClassId }
        });

        if (!student) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses untuk mengubah data siswa ini' });
        }

        // Perbarui status kehadiran siswa
        const [updated] = await Attendance.update(
            { status },
            { where: { student_id, date, class_id: waliKelasClassId } }
        );

        if (updated === 0) {
            return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
        }

        res.json({ message: 'Status kehadiran berhasil diperbarui' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** SCHEDULE ***
router.get('/schedule', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { day } = req.query;  // Ambil query parameter "day"

        // Buat kondisi filter untuk class_id wali kelas
        const whereCondition = { class_id: req.user.class_id };

        // Jika ada filter "day", tambahkan ke kondisi where
        if (day) {
            whereCondition.day = { [Op.eq]: day };  // Case-insensitive search
        }

        const schedule = await Schedule.findAll({
            where: whereCondition,
            attributes: ['id', 'subject_id', 'day', 'start_time', 'end_time'],
            include: [{ model: Subject, as: "subject", attributes: ['name'] }]
        });

        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** MENAMPILKAN DAFTAR EVALUASI (TITLE) ***
router.get('/evaluations', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const evaluations = await Evaluation.findAll({
            where: { class_id: req.user.class_id },
            attributes: ['id', 'title']
        });

        res.json(evaluations);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// edit title
router.put('/evaluations/:id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        // Cek apakah evaluasi ada di database
        const evaluation = await Evaluation.findOne({
            where: { id, class_id: req.user.class_id }
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Update title evaluasi
        await evaluation.update({ title });

        res.json({ message: 'Evaluasi berhasil diperbarui', evaluation });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui evaluasi', error: error.message });
    }
});

// hapus title
router.delete('/evaluations/:id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah evaluasi ada di database
        const evaluation = await Evaluation.findOne({
            where: { id, class_id: req.user.class_id }
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Hapus evaluasi
        await evaluation.destroy();

        res.json({ message: 'Evaluasi berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus evaluasi', error: error.message });
    }
});

// *** MENAMPILKAN DETAIL EVALUASI (DAFTAR SISWA & DESKRIPSI) ***
router.get('/evaluations/:evaluation_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id } = req.params;

        const evaluation = await Evaluation.findOne({ 
            where: { id: evaluation_id, class_id: req.user.class_id },
            attributes: ['id', 'title']
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        const studentEvaluations = await StudentEvaluation.findAll({
            where: { evaluation_id },
            include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }],
            attributes: ['id', 'description']
        });

        res.json({ evaluation, studentEvaluations });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** MENAMBAHKAN JUDUL EVALUASI BARU ***
router.post('/evaluations', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { title } = req.body;
        const classId = req.user.class_id;

        const evaluation = await Evaluation.create({ class_id: classId, title });

        const students = await Student.findAll({ where: { class_id: classId } });

        const studentEvaluations = students.map(student => ({
            evaluation_id: evaluation.id,
            student_id: student.id,
            description: null
        }));

        await StudentEvaluation.bulkCreate(studentEvaluations);

        res.status(201).json({ message: 'Evaluasi berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** MEMPERBARUI DESKRIPSI EVALUASI SISWA ***
router.put('/evaluations/:evaluation_id/students/:student_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id, student_id } = req.params;
        const { description } = req.body;

        const studentEvaluation = await StudentEvaluation.findOne({
            where: { evaluation_id, student_id }
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi siswa tidak ditemukan' });
        }

        await studentEvaluation.update({ description });

        res.json({ message: 'Evaluasi siswa berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// // *** MENGAMBIL DETAIL EVALUASI DARI SEORANG SISWA ***
// router.get('/evaluations/:evaluation_id/students/:student_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
//     try {
//         const { evaluation_id, student_id } = req.params;

//         const studentEvaluation = await StudentEvaluation.findOne({
//             where: { evaluation_id, student_id },
//             include: [{ model: Student, attributes: ['id', 'name'] }],
//             attributes: ['id', 'description']
//         });

//         if (!studentEvaluation) {
//             return res.status(404).json({ message: 'Evaluasi siswa tidak ditemukan' });
//         }

//         res.json(studentEvaluation);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// });

// *** GRADES ***
// list mapel sesuai jadwal
router.get('/grades', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const classId = req.user.class_id;

        const schedules = await Schedule.findAll({
            where: { class_id: classId },
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
        const classId = req.user.class_id; // Ambil kelas dari wali kelas yang login

        console.log("Fetching categories for:", { subject_id, classId }); // 🔍 Debugging

        const categories = await GradeCategory.findAll({
            where: { subject_id, class_id: classId },
            attributes: ['id', 'name']
        });

        console.log("Found categories:", categories); // 🔍 Debugging hasil query

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
        const classId = req.user.class_id; // Ambil kelas wali kelas

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
        const classId = req.user.class_id;

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

        // Cek apakah kategori ada
        const categoryExists = await GradeCategory.findOne({ where: { id: category_id } });

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
            where: { class_id: req.user.class_id },
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

        // Cek apakah detail penilaian ada
        const detailExists = await GradeDetail.findOne({ where: { id: detail_id } });

        if (!detailExists) {
            return res.status(404).json({ message: 'Grade detail not found' });
        }

        // Cek apakah nama baru sudah ada dalam kategori yang sama
        const duplicateDetail = await GradeDetail.findOne({
            where: { 
                grade_category_id: detailExists.grade_category_id, 
                name, 
                id: { [Op.ne]: detail_id } // Cek selain data yang sedang diedit
            }
        });

        if (duplicateDetail) {
            return res.status(400).json({ message: 'Detail name already exists in this category' });
        }

        // Update detail penilaian
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

        // Cek apakah detail penilaian ada di database
        const detailExists = await GradeDetail.findOne({ where: { id: detail_id } });

        if (!detailExists) {
            return res.status(404).json({ message: 'Grade detail not found' });
        }

        // Hapus semua skor siswa yang terkait dengan detail ini
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