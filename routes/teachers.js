const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Student, Evaluation, Attendance, Grade, StudentEvaluation, Schedule, Subject, Assessment, AssessmentType, StudentScore } = require('../models');
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

        // Pastikan wali kelas memilih tanggal
        if (!date) {
            return res.status(400).json({ message: 'Tanggal harus disertakan' });
        }

        // Mencari daftar kehadiran berdasarkan tanggal
        const attendances = await Attendance.findAll({
            where: { date },
            include: [
                {
                    model: Student, // Pastikan model Student terhubung dengan Attendance
                    as: 'student',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (attendances.length === 0) {
            return res.status(404).json({ message: 'Tidak ada data kehadiran untuk tanggal ini' });
        }

        res.json(attendances);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/attendances', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.body;
        const classId = req.user.class_id;

        const students = await Student.findAll({ where: { class_id: classId } });

        const attendanceRecords = students.map(student => ({
            student_id: student.id,
            class_id: classId,
            date,
            status: null
        }));

        await Attendance.bulkCreate(attendanceRecords);

        res.status(201).json({ message: 'Data kehadiran berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/attendances/:date', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.params;
        const { student_id, status } = req.body;

        // Pastikan wali kelas memilih siswa dan status yang ingin diubah
        if (!student_id || !status) {
            return res.status(400).json({ message: 'Student ID dan status harus disertakan' });
        }

        // Mencari data kehadiran berdasarkan student_id dan tanggal
        const attendance = await Attendance.findOne({
            where: { student_id, date }
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Data kehadiran tidak ditemukan untuk siswa pada tanggal ini' });
        }

        // Memperbarui status kehadiran
        await attendance.update({ status });

        res.json({ message: 'Data kehadiran berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// router.delete('/attendances/:attendance_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
//     try {
//         const { attendance_id } = req.params;
//         await Attendance.destroy({ where: { id: attendance_id } });

//         res.json({ message: 'Data kehadiran dihapus' });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// });

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
router.get('/grades', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const classId = req.user.class_id;

        // 🔍 Cari mata pelajaran berdasarkan schedule yang sudah dibuat oleh admin
        const schedules = await Schedule.findAll({
            where: { class_id: classId },
            include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
            attributes: ['subject_id']
        });

        // Hapus duplikat mata pelajaran (karena satu pelajaran bisa ada di beberapa jadwal)
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

module.exports = router