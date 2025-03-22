const express = require('express');
const router = express.Router();
const { Student, Evaluation, Attendance, Grade, StudentEvaluation } = require('../models');
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

router.get('/evaluations/:evaluation_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { evaluation_id } = req.params;

        const studentEvaluations = await StudentEvaluation.findAll({
            where: { evaluation_id },
            include: [{ model: Student, attributes: ['id', 'name'] }],
            attributes: ['id', 'description']
        });

        res.json(studentEvaluations);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route untuk menambahkan evaluasi siswa
router.post('/evaluations', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { title } = req.body;
        const classId = req.user.class_id;

        const evaluation = await Evaluation.create({ class_id: classId, title });

        // Ambil semua siswa di kelas wali kelas
        const students = await Student.findAll({ where: { class_id: classId } });

        // Tambahkan student_evaluations dengan description NULL
        const studentEvaluations = students.map(student => ({
            evaluation_id: evaluation.id,
            student_id: student.id,
            description: null
        }));

        await StudentEvaluation.bulkCreate(studentEvaluations);

        res.status(201).json({ message: 'Judul evaluasi berhasil ditambahkan', evaluation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

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

// Route untuk menambahkan penilaian akademik siswa
router.post('/assessments', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { student_id, subject_id, type, title, score } = req.body;
        const assessment = await Grade.create({
            student_id,
            teacher_id: req.user.id,
            subject_id,
            type,
            title,
            score
        });
        res.status(201).json(assessment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/attendance', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const classId = req.user.class_id;

        // Ambil tanggal terakhir yang tersedia
        const lastDate = await Attendance.max('date', {
            include: [{ model: Student, as: "student", where: { class_id: classId } }]
        });

        if (!lastDate) {
            return res.status(404).json({ message: 'Belum ada data kehadiran' });
        }

        // Ambil daftar kehadiran siswa berdasarkan tanggal terakhir
        const attendanceList = await Attendance.findAll({
            where: { date: lastDate },
            include: [{ model: Student, as: "student", attributes: ['id', 'name'] }],
            attributes: ['id', 'date', 'status']
        });

        res.json({ date: lastDate, attendanceList });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/attendance', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const classId = req.user.class_id;
        const currentDate = new Date().toISOString().split('T')[0];

        // Cek apakah data sudah ada untuk hari ini
        const existingData = await Attendance.findOne({
            where: { date: currentDate, class_id: classId }, // Tambahkan class_id
            include: [{ model: Student, as: "student", where: { class_id: classId } }]
        });

        if (existingData) {
            return res.status(400).json({ message: 'Data kehadiran untuk hari ini sudah ada' });
        }

        // Ambil semua siswa dalam kelas
        const students = await Student.findAll({ where: { class_id: classId } });

        // Buat data kehadiran dengan status `null`
        const attendanceRecords = students.map(student => ({
            student_id: student.id,
            class_id: classId, // Tambahkan ini
            date: currentDate,
            status: null
        }));

        await Attendance.bulkCreate(attendanceRecords);

        res.status(201).json({ message: 'Data kehadiran berhasil ditambahkan, silakan edit status siswa' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/attendance/:attendance_id', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { attendance_id } = req.params;
        const { status } = req.body;

        if (!['hadir', 'izin', 'sakit', 'alpha'].includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid' });
        }

        const attendance = await Attendance.findByPk(attendance_id);
        if (!attendance) {
            return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
        }

        await attendance.update({ status });

        res.json({ message: 'Status kehadiran berhasil diperbarui', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router