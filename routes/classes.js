var express = require("express");
var router = express.Router();
const Validator = require("fastest-validator");
const { Class, User, Student, Evaluation, Attendance } = require("../models");
const { isWaliKelas } = require('../middlewares/isWaliKelasValidation');
const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');
const v = new Validator();

// Get semua kelas
router.get("/", accessValidation, roleValidation(["admin", "kepala_sekolah"]), async (req, res) => {
    const { teacher_id } = req.query;

    let whereClause = {};
    if (teacher_id) whereClause.teacher_id = teacher_id;

    try {
        const classes = await Class.findAll({
            where: whereClause,
            include: [
                { model: User, as: "teacher", attributes: ["id", "name", "nip", "email"] },
                { model: Student, as: "students", attributes: ["id", "name"] }
            ]
        });
        return res.json(classes);
    } catch (error) {
        return res.status(500).json({ message: "Error retrieving classes", error });
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

// GET Evaluations for all students in a class
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
                    attributes: ["id", "title", "description"]
                }
            ]
        });

        console.log("Students with evaluations:", JSON.stringify(students, null, 2));

        if (!students.length) {
            return res.status(404).json({ message: "No students found in this class" });
        }

        res.json(students);
    } catch (error) {
        console.error("Get Class Evaluations Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// **GET**: Ambil daftar kehadiran siswa dalam kelas tertentu (Hanya wali kelas yang bisa mengakses)
router.get("/:classId/attendances", accessValidation, isWaliKelas, async (req, res) => {
    try {
        const { classId } = req.params;

        console.log("User in isWaliKelas:", req.user); // ✅ Debugging

        const attendances = await Attendance.findAll({
            include: [{
                model: Student,
                as: "student",
                where: { class_id: classId }
            }]
        });

        if (!attendances.length) {
            return res.status(404).json({ message: "No attendance records found for this class" });
        }

        res.status(200).json(attendances);
    } catch (error) {
        console.error("Error fetching attendances:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server", details: error.message });
    }
});

// **POST**: Tambah data kehadiran siswa dalam kelas tertentu (Hanya wali kelas yang bisa mengakses)
router.post('/:classId/attendance', isWaliKelas, async (req, res) => {
    try {
        const { classId } = req.params;
        const { student_id, date, status } = req.body;

        // Pastikan siswa berada di kelas yang benar
        const student = await Student.findOne({ where: { id: student_id, class_id: classId } });

        if (!student) {
            return res.status(404).json({ message: 'Siswa tidak ditemukan di kelas ini' });
        }

        const attendance = await Attendance.create({ student_id, date, status });
        res.status(201).json(attendance);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// **PUT**: Perbarui kehadiran siswa dalam kelas tertentu (Hanya wali kelas yang bisa mengakses)
router.put('/:classId/attendances/:attendanceId', isWaliKelas, async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const { status } = req.body;

        const attendance = await Attendance.findByPk(attendanceId, {
            include: [{ model: Student, as: 'student' }]
        });

        if (!attendance || attendance.student.class_id !== req.params.classId) {
            return res.status(403).json({ message: 'Akses ditolak. Data kehadiran ini bukan dari kelas Anda.' });
        }

        attendance.status = status;
        await attendance.save();
        res.status(200).json(attendance);
    } catch (error) {
        res.status(400).json({ error: error.message });
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

module.exports = router;
