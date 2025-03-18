var express = require('express');
var router = express.Router();
const { Student, Attendance, Schedule, Subject, Class, Evaluation, User } = require('../models');
// const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');
// const isParentValidation = require('../middlewares/isParentValidation');
const { isWaliKelas } = require('../middlewares/isWaliKelasValidation');

router.get("/attendances", accessValidation, isWaliKelas, async (req, res) => {
    try {
        const classId = req.classId; // Ambil dari middleware
        const { date } = req.query;
        const currentDate = date || new Date().toISOString().split("T")[0]; // Default ke hari ini

        // Ambil daftar siswa di kelas
        const students = await Student.findAll({
            where: { class_id: classId },
            attributes: ["id", "name"]
        });

        if (!students.length) {
            return res.status(404).json({ message: "Tidak ada siswa di kelas ini" });
        }

        // Ambil daftar kehadiran berdasarkan tanggal
        let attendances = await Attendance.findAll({
            where: { date: currentDate },
            include: [{ model: Student, as: "student", attributes: ["id", "name"] }]
        });

        // Buat daftar kehadiran dengan status `null` jika belum ada
        const studentAttendanceMap = {};
        attendances.forEach(att => {
            studentAttendanceMap[att.student.id] = att;
        });

        const attendanceList = students.map(student => ({
            student_id: student.id,
            student_name: student.name,
            date: currentDate,
            status: studentAttendanceMap[student.id]?.status || null
        }));

        res.status(200).json(attendanceList);
    } catch (error) {
        console.error("Error fetching attendances:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server", details: error.message });
    }
});

router.post('/attendances', isWaliKelas, async (req, res) => {
    console.log("📌 User setelah validasi:", req.user);
    try {
        const { date } = req.body;
        const currentDate = date || new Date().toISOString().split("T")[0];

        if (!date) {
            return res.status(400).json({ message: "Tanggal (date) wajib diisi." });
        }

        // Ambil user dari request (wali kelas)
        const user = req.user;

        // Ambil daftar siswa berdasarkan wali kelas
        const students = await Student.findAll({
            where: { class_id: user.class_id },
            attributes: ["id", "name"]
        });

        if (!students.length) {
            return res.status(404).json({ message: "Tidak ada siswa di kelas ini." });
        }

        // Ambil daftar kehadiran yang sudah ada untuk tanggal ini
        const existingAttendances = await Attendance.findAll({
            where: { date: currentDate },
            attributes: ["student_id", "status"]
        });

        const existingStudentIds = existingAttendances.map(a => a.student_id);

        // Tambahkan kehadiran dengan status null untuk siswa yang belum ada
        const newAttendances = [];
        for (const student of students) {
            if (!existingStudentIds.includes(student.id)) {
                const attendance = await Attendance.create({
                    student_id: student.id,
                    date: currentDate,
                    status: null
                });
                newAttendances.push(attendance);
            }
        }

        // Ambil ulang daftar kehadiran yang sudah tersimpan
        const allAttendances = await Attendance.findAll({
            where: { date: currentDate },
            include: [{ model: Student, as: "student", attributes: ["id", "name"] }],
            attributes: ["id", "status"]
        });

        res.status(201).json({
            message: "Data kehadiran berhasil diperbarui",
            attendances: allAttendances.map(att => ({
                id: att.id,
                student_id: att.student.id,
                student_name: att.student.name,
                date: currentDate,
                status: att.status
            }))
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/attendances/:attendanceId', accessValidation, isWaliKelas, async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const { status } = req.body;
        const classId = req.classId; // Ambil dari middleware

        const attendance = await Attendance.findByPk(attendanceId, {
            include: [{ model: Student, as: 'student' }]
        });

        if (!attendance || attendance.student.class_id !== classId) {
            return res.status(403).json({ message: 'Akses ditolak. Data kehadiran ini bukan dari kelas Anda.' });
        }

        attendance.status = status;
        await attendance.save();

        res.status(200).json({ message: "Status kehadiran berhasil diperbarui", attendance });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
