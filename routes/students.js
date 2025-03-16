var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Student, Attendance, Schedule, Subject, Class, EvaluationTitle, StudentEvaluation, User } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');
const validateParentAccess = require('../middlewares/isParentValidation');

// **GET /students** → Hanya menampilkan nama siswa
router.get('/', accessValidation, roleValidation(["admin", "wali_kelas"]), async (req, res) => {
    try {
        const students = await Student.findAll({
            attributes: ['id', 'name'] // ✅ Hanya menampilkan nama siswa
        });

        return res.json(students);
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
});

// **GET /students/:id** → Menampilkan detail siswa
router.get('/:id', accessValidation, validateParentAccess, roleValidation(['orang_tua']), async (req, res) => {
    try {
        const id = req.params.id;
        const student = await Student.findByPk(id, {
            attributes: ['id', 'name', 'nisn', 'birth_date'], // ✅ Ambil field utama siswa
            include: [
                {
                    model: Class,
                    as: 'class',
                    attributes: ['name'] // ✅ Hanya ambil nama kelas
                },
                {
                    model: User,
                    as: 'parent',
                    attributes: ['name'] // ✅ Hanya ambil nama parent
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        return res.json(student);
    } catch (error) {
        console.error("Error fetching student by ID:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
});

router.get('/:id/attendances', accessValidation, async (req, res) => {
    try {
        const id = req.params.id;

        // Cari siswa berdasarkan ID
        const student = await Student.findByPk(id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
  
        // Ambil data kehadiran siswa
        const attendances = await Attendance.findAll({
            where: { student_id: id },
            attributes: ['date', 'status'],
            order: [['date', 'ASC']]
        });
  
        if (!attendances.length) {
            return res.status(404).json({ message: 'Tidak ada data kehadiran untuk siswa ini' });
        }
  
        res.json(attendances);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/schedules', accessValidation, async (req, res) => {
    try {
        const id = req.params.id;

        // Cari siswa berdasarkan ID
        const student = await Student.findByPk(id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
  
        // Ambil data kehadiran siswa
        const schedules = await Schedule.findAll({
            where: { class_id: student.class_id },
            attributes: ['day', 'start_time', 'end_time'],
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                }
            ],
            order: [['day', 'ASC'], ['start_time', 'ASC']]
        });
  
        if (!schedules.length) {
            return res.status(404).json({ message: 'Tidak ada data jadwal untuk kelas siswa ini' });
        }
  
        // Format data agar hanya menampilkan hari, waktu, dan nama mata pelajaran
        const formattedSchedules = schedules.map(schedule => ({
            day: schedule.day,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            subject: schedule.subject.name
        }));

        res.json(formattedSchedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


// Get semua evaluasi untuk siswa tertentu
router.get('/:id/evaluations', accessValidation, async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil daftar evaluasi untuk siswa
        const evaluations = await StudentEvaluation.findAll({
            where: { student_id: id },
            include: [{ model: EvaluationTitle, as: 'evaluation-title', attributes: ['title'] }],
            attributes: ['id', 'description']
        });

        if (!evaluations.length) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan untuk siswa ini' });
        }

        // Format response
        const response = evaluations.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description
        }));

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Get detail evaluasi berdasarkan title
router.get('/:id/evaluations/:title', accessValidation, async (req, res) => {
    try {
        const { id, title } = req.params;

        const evaluation = await StudentEvaluation.findOne({
            where: { student_id: id },
            include: [{ model: EvaluationTitle, as: 'evaluation-title', where: { title }, attributes: ['title'] }]
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        res.json({
            id: evaluation.id,
            title: evaluation.evaluationTitle.title,
            description: evaluation.description
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Tambah siswa baru
router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        name: 'string',
        nisn: 'string',
        birth_date: {type: 'date', convert: true},
        class_id: 'number',
        parent_id: 'number'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const student = await Student.create(req.body);
    res.json(student);
});

// Update siswa
router.put('/:id', accessValidation, roleValidation(["admin", "wali_kelas"]), async (req, res) => {
    const id = req.params.id;
    
    let student = await Student.findByPk(id);
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    const schema = {
        name: 'string|optional',
        nisn: 'string|optional',
        birth_date: 'date|optional',
        class_id: 'number|optional',
        parent_id: 'number|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    student = await student.update(req.body);
    res.json(student);
});

// Hapus siswa
router.delete('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const student = await Student.findByPk(id);

    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    await student.destroy();
    res.json({ message: 'Student is deleted' });
});

module.exports = router;
