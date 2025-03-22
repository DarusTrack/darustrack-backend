var express = require("express");
var router = express.Router();
const Validator = require("fastest-validator");
const { Class, User, Student, Evaluation, Attendance, Schedule, Subject } = require("../models");
const isWaliKelas = require('../middlewares/isWaliKelasValidation');
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');
const v = new Validator();

// Get semua kelas
router.get('/', accessValidation, async (req, res) => {
    try {
        const { grade_level } = req.query; // Ambil query parameter grade_level

        // Buat kondisi filter jika grade_level tersedia
        const whereCondition = grade_level ? { grade_level } : {};

        const classes = await Class.findAll({
            attributes: ['id', 'name', 'grade_level'], 
            where: whereCondition, // Filter berdasarkan grade_level jika ada
            order: [['name', 'ASC']]
        });

        res.json(classes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


// Get kelas berdasarkan ID
router.get("/:id", accessValidation, roleValidation(["admin", "wali_kelas", "kepala_sekolah"]), async (req, res) => {
    const id = req.params.id;
    const classData = await Class.findByPk(id, {
        include: [
            { model: User, as: "teacher", attributes: ["id", "name", "email"] },
            { model: Student, as: "students", attributes: ["id", "name"] }
        ]
    });

    if (!classData) {
        return res.status(404).json({ message: "Class not found" });
    }

    return res.json(classData);
});

// Update kelas
router.put("/:id", accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;

    let classData = await Class.findByPk(id);
    if (!classData) {
        return res.status(404).json({ message: "Class not found" });
    }

    const schema = {
        name: "string|optional",
        grade_level: "string|optional",
        teacher_id: "number|optional"
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    classData = await classData.update(req.body);
    res.json(classData);
});

// Hapus kelas
router.delete("/:id", accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const classData = await Class.findByPk(id);

    if (!classData) {
        return res.status(404).json({ message: "Class not found" });
    }

    await classData.destroy();
    res.json({ message: "Class is deleted" });
});

router.get("/:classId/attendances", accessValidation, isWaliKelas, async (req, res) => {
    try {
        const { classId } = req.params;
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

router.post('/:classId/attendances', accessValidation, isWaliKelas, async (req, res) => {
    try {
        const { classId } = req.params;
        const { date } = req.body;
        const currentDate = date || new Date().toISOString().split("T")[0]; // Default ke hari ini

        // Ambil daftar siswa di kelas
        const students = await Student.findAll({
            where: { class_id: classId },
            attributes: ["id", "name"]
        });

        if (!students.length) {
            return res.status(404).json({ message: "Tidak ada siswa di kelas ini" });
        }

        // Cek kehadiran yang sudah ada
        const existingAttendances = await Attendance.findAll({
            where: { date: currentDate, class_id: classId }, // Tambahkan class_id
            attributes: ["student_id"]
        });        

        const existingStudentIds = existingAttendances.map(a => a.student_id);

        // Tambahkan data kehadiran dengan status null untuk siswa yang belum ada
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

        res.status(201).json({
            message: "Data kehadiran berhasil diperbarui",
            new_attendances: newAttendances
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:classId/attendances/:attendanceId', accessValidation, isWaliKelas, async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const { status } = req.body;

        const attendance = await Attendance.findByPk(attendanceId, {
            include: [{ model: Student, as: 'student' }]
        });

        if (!attendance || attendance.student.class_id !== parseInt(req.params.classId)) {
            return res.status(403).json({ message: 'Akses ditolak. Data kehadiran ini bukan dari kelas Anda.' });
        }

        attendance.status = status;
        await attendance.save();

        res.status(200).json({ message: "Status kehadiran berhasil diperbarui", attendance });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 🔹 Get semua jadwal di kelas tertentu (bisa difilter berdasarkan hari)
router.get("/:classId/schedules", accessValidation, async (req, res) => {
    try {
        const { classId } = req.params;
        const { day } = req.query; // Query parameter untuk filter hari

        // Cek apakah kelas tersedia
        const classExists = await Class.findByPk(classId);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Ambil jadwal berdasarkan classId dan filter hari jika ada
        const whereCondition = { class_id: classId };
        if (day) whereCondition.day = day;

        const schedules = await Schedule.findAll({
            where: whereCondition,
            include: [{ model: Subject, as: "subject", attributes: ["id", "name"] }],
            order: [["start_time", "ASC"]]
        });

        res.json(schedules);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// 🔹 Tambah jadwal baru untuk kelas tertentu
router.post("/:classId/schedules", accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        subject_id: "number",
        start_time: "string",
        end_time: "string",
        day: "string"
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    try {
        const { classId } = req.params;
        const { subject_id, start_time, end_time, day } = req.body;

        // Pastikan kelas ada
        const classExists = await Class.findByPk(classId);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Simpan jadwal baru
        const newSchedule = await Schedule.create({
            class_id: classId,
            subject_id,
            start_time,
            end_time,
            day
        });

        res.status(201).json({ message: "Jadwal berhasil ditambahkan", schedule: newSchedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Update jadwal pelajaran tertentu
router.put("/:classId/schedules/:scheduleId", accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { classId, scheduleId } = req.params;
        const { subject_id, start_time, end_time, day } = req.body;

        const schedule = await Schedule.findByPk(scheduleId);
        if (!schedule || schedule.class_id !== parseInt(classId)) {
            return res.status(404).json({ message: "Jadwal tidak ditemukan" });
        }

        // Update data jadwal
        schedule.subject_id = subject_id || schedule.subject_id;
        schedule.start_time = start_time || schedule.start_time;
        schedule.end_time = end_time || schedule.end_time;
        schedule.day = day || schedule.day;

        await schedule.save();

        res.json({ message: "Jadwal berhasil diperbarui", schedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Hapus jadwal pelajaran tertentu
router.delete("/:classId/schedules/:scheduleId", accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { classId, scheduleId } = req.params;

        const schedule = await Schedule.findByPk(scheduleId);
        if (!schedule || schedule.class_id !== parseInt(classId)) {
            return res.status(404).json({ message: "Jadwal tidak ditemukan" });
        }

        await schedule.destroy();
        res.json({ message: "Jadwal berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Evaluations for all students in a class (Now includes title and description)
router.get("/:id/evaluations", accessValidation, roleValidation(["admin", "wali_kelas", "kepala_sekolah"]), async (req, res) => {
    try {
        const classId = req.params.id;

        // Periksa apakah kelas ada
        const classExists = await Class.findByPk(classId);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Ambil semua siswa dalam kelas beserta evaluasi mereka
        const students = await Student.findAll({
            where: { class_id: classId },
            attributes: ["id", "name"],
            include: [
                {
                    model: Evaluation,
                    as: "evaluations",
                    attributes: ["id", "title", "description"] // Tambahkan description
                }
            ]
        });

        if (!students.length) {
            return res.status(404).json({ message: "No students found in this class" });
        }

        res.json(students);
    } catch (error) {
        console.error("Get Class Evaluations Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// GET Evaluations for a specific student (Now includes title and description)
router.get("/:classId/:studentId/evaluations", accessValidation, async (req, res) => {
    try {
        const { classId, studentId } = req.params;

        // Pastikan siswa ada dalam kelas yang sesuai
        const student = await Student.findOne({
            where: { id: studentId, class_id: classId }
        });

        if (!student) {
            return res.status(404).json({ message: "Siswa tidak ditemukan dalam kelas ini." });
        }

        // Ambil daftar evaluasi berdasarkan studentId
        const evaluations = await Evaluation.findAll({
            where: { student_id: studentId },
            attributes: ["title", "description"] // Tambahkan description
        });

        res.json({
            studentId,
            classId,
            evaluations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan server." });
    }
});

// GET Detail Evaluation by Title (Now includes description)
router.get("/:classId/:studentId/evaluations/:title", accessValidation, async (req, res) => {
    try {
        const { classId, studentId, title } = req.params;

        // Cari evaluasi berdasarkan studentId dan title
        const evaluation = await Evaluation.findOne({
            where: { student_id: studentId, title },
            attributes: ["title", "description"]
        });

        if (!evaluation) {
            return res.status(404).json({ message: "Evaluasi tidak ditemukan." });
        }

        res.json(evaluation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan server." });
    }
});

// 🔹 Wali Kelas: Tambah evaluasi siswa
router.post("/:classid/:studentId/evaluations", accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const { classid, studentId } = req.params;
    const schema = {
        title: { type: "enum", values: ["Mengenai Perilaku Anak", "Hasil Evaluasi Belajar Anak"] },
        description: "string|optional"
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    try {
        const student = await Student.findOne({ where: { id: studentId, class_id: classid } });
        if (!student) {
            return res.status(404).json({ message: "Siswa tidak ditemukan dalam kelas ini." });
        }

        const evaluation = await Evaluation.create({ ...req.body, student_id: studentId });
        res.status(201).json({ message: "Evaluasi berhasil ditambahkan", evaluation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/:classid/:studentId/evaluations/:title", accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { classid, studentId, title } = req.params;
        const { description } = req.body;

        // Cari evaluasi berdasarkan studentId dan title
        const evaluation = await Evaluation.findOne({
            where: { student_id: studentId, title }
        });

        // Jika tidak ditemukan, kembalikan respons 404
        if (!evaluation) {
            return res.status(404).json({ message: "Evaluasi tidak ditemukan dalam kelas ini." });
        }

        // Perbarui data evaluasi
        await Evaluation.update(
            { description }, 
            { where: { student_id: studentId, title } }
        );

        // Ambil kembali evaluasi yang telah diperbarui
        const updatedEvaluation = await Evaluation.findOne({
            where: { student_id: studentId, title }
        });

        res.json({ message: "Evaluasi berhasil diperbarui", evaluation: updatedEvaluation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Wali Kelas: Hapus evaluasi berdasarkan judul
router.delete("/:classid/:studentId/evaluations/:title", accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    try {
        const { classid, studentId, title } = req.params;

        const evaluation = await Evaluation.findOne({ where: { student_id: studentId, title } });
        if (!evaluation) {
            return res.status(404).json({ message: "Evaluasi tidak ditemukan." });
        }

        await evaluation.destroy();
        res.json({ message: "Evaluasi berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tambah kelas baru
router.post("/", accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        name: "string",
        grade_level: "string",
        teacher_id: "number"
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const classData = await Class.create(req.body);
    res.json(classData);
});

module.exports = router;
