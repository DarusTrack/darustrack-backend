var express = require("express");
var router = express.Router();
const Validator = require("fastest-validator");
const { Class, User, Student, Evaluation, Grade } = require("../models");
const roleValidation = require("../middleware/roleValidation");
const accessValidation = require("../middleware/accessValidation");
const v = new Validator();

// Get semua kelas
router.get("/", accessValidation, roleValidation(["admin", "kepala_sekolah"]), async (req, res) => {
    const { wali_kelas_id, level } = req.query;

    let whereClause = {};
    if (wali_kelas_id) whereClause.wali_kelas_id = wali_kelas_id;
    if (level) whereClause.level = level;

    try {
        const classes = await Class.findAll({
            where: whereClause,
            include: [
                { model: User, as: "wali_kelas", attributes: ["id", "name", "email"] },
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
            { model: User, as: "wali_kelas", attributes: ["id", "name", "email"] },
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
                    attributes: ["id", "title", "comment", "createdAt"]
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

// Tambah kelas baru
router.post("/", accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        level: { type: "enum", values: ["1", "2", "3", "4", "5", "6"] },
        name: "string",
        wali_kelas_id: "number"
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
        level: { type: "enum", values: ["1", "2", "3", "4", "5", "6"] },
        name: "string|optional",
        wali_kelas_id: "number|optional"
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
