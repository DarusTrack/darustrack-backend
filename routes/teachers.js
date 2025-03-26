const express = require('express');
const router = express.Router();
const { Student, Evaluation, Attendance, Grade, StudentEvaluation, Assessment, StudentAssessment, Schedule, Subject } = require('../models');
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
router.get('/attendances', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { date } = req.query;
        const whereCondition = { class_id: req.user.class_id };
        if (date) whereCondition.date = date;

        const attendances = await Attendance.findAll({
            where: whereCondition,
            include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }]
        });

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

router.put('/attendances/:attendance_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { attendance_id } = req.params;
        const { status } = req.body;

        const attendance = await Attendance.findByPk(attendance_id);
        if (!attendance) return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });

        await attendance.update({ status });

        res.json({ message: 'Data kehadiran diperbarui' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.delete('/attendances/:attendance_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { attendance_id } = req.params;
        await Attendance.destroy({ where: { id: attendance_id } });

        res.json({ message: 'Data kehadiran dihapus' });
    } catch (error) {
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
            whereCondition.day = { [Op.iLike]: `%${day}%` };  // Case-insensitive search
        }

        const schedule = await Schedule.findAll({
            where: whereCondition,
            attributes: ['id', 'subject_id', 'day', 'start_time', 'end_time']
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

// *** MENAMPILKAN DETAIL EVALUASI (DAFTAR SISWA & DESKRIPSI) ***
router.get('/evaluations/:evaluation_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id } = req.params;

        const evaluation = await Evaluation.findOne({ 
            where: { id: evaluation_id, class_id: req.user.class_id }
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

        res.status(201).json({ message: 'Evaluasi berhasil ditambahkan', evaluation });
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

        res.json({ message: 'Evaluasi siswa berhasil diperbarui', studentEvaluation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** MENGAMBIL DETAIL EVALUASI DARI SEORANG SISWA ***
router.get('/evaluations/:evaluation_id/students/:student_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id, student_id } = req.params;

        const studentEvaluation = await StudentEvaluation.findOne({
            where: { evaluation_id, student_id },
            include: [{ model: Student, attributes: ['id', 'name'] }],
            attributes: ['id', 'description']
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi siswa tidak ditemukan' });
        }

        res.json(studentEvaluation);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// *** GRADES ***
// Menambahkan Mata Pelajaran ke Kelas
router.post('/grades/add-subject', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { subject_id } = req.body;
        const classId = req.user.class_id; // Ambil ID kelas dari wali kelas yang login

        if (!subject_id) {
            return res.status(400).json({ message: 'Subject ID harus diisi' });
        }

        // Cek apakah hubungan kelas-mata pelajaran sudah ada
        const existingGrade = await Grade.findOne({
            where: { class_id: classId, subject_id }
        });

        if (existingGrade) {
            return res.status(400).json({ message: 'Mata pelajaran sudah terhubung dengan kelas ini' });
        }

        // Tambahkan hubungan kelas-mata pelajaran ke tabel `grades`
        const newGrade = await Grade.create({ class_id: classId, subject_id });

        res.status(201).json({
            message: 'Mata pelajaran berhasil ditambahkan ke kelas',
            grade: newGrade
        });
    } catch (error) {
        console.error("Error adding subject to class:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Ambil daftar mata pelajaran dalam kelas wali kelas
router.get('/grades', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const classId = req.user.class_id;

        const subjects = await Grade.findAll({
            where: { class_id: classId },
            include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }]
        });

        res.json(subjects.map(grade => ({ id: grade.subject.id, name: grade.subject.name })));
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router