var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Student, Attendance, Schedule, Subject, Class, Evaluation, User } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');
const isParentValidation = require('../middlewares/isParentValidation');

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
router.get('/:id', accessValidation, isParentValidation, roleValidation(['orang_tua']), async (req, res) => {
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

        // Tambahkan informasi hari
        const formattedAttendances = attendances.map(attendance => {
            const date = new Date(attendance.date);
            const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
            return {
                date: attendance.date,
                day: dayName, // Nama hari dalam bahasa Indonesia
                status: attendance.status
            };
        });

        res.json(formattedAttendances);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/schedules', accessValidation, roleValidation(["orang_tua"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { day } = req.query; // Filter berdasarkan hari (opsional)

        // Cek apakah siswa dengan ID tersebut ada
        const student = await Student.findByPk(id, {
            include: {
                model: Class,
                as: 'class',
                attributes: ['id', 'name'] // Ambil ID dan Nama Kelas
            }
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Ambil jadwal berdasarkan kelas siswa
        const whereClause = { class_id: student.class.id };
        if (day) {
            whereClause.day = day; // Filter berdasarkan hari jika ada
        }

        const schedules = await Schedule.findAll({
            where: whereClause,
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
            return res.status(404).json({ message: 'Tidak ada jadwal untuk kelas ini' });
        }

        // Format hasil response
        const formattedSchedules = schedules.map(schedule => ({
            day: schedule.day,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            subject: schedule.subject.name
        }));

        res.json(formattedSchedules);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
});

// Get semua evaluasi untuk siswa tertentu (menampilkan daftar title)
router.get('/:id/evaluations', accessValidation, async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil daftar evaluasi berdasarkan student_id
        const evaluations = await Evaluation.findAll({
            where: { student_id: id },
            attributes: ['id', 'title'] // Hanya ambil id & title
        });

        if (!evaluations.length) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan untuk siswa ini' });
        }

        res.json({
            student_id: id,
            evaluations: evaluations.map(e => ({
                id: e.id,
                title: e.title
            }))
        });
    } catch (error) {
        console.error("Error fetching evaluations:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get detail evaluasi berdasarkan title
router.get('/:id/evaluations/:title', accessValidation, async (req, res) => {
    try {
        const { id, title } = req.params;

        // Cari evaluasi berdasarkan student_id dan title
        const evaluation = await Evaluation.findOne({
            where: { student_id: id, title },
            attributes: ['id', 'title', 'description'] // Ambil id, title, description
        });

        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan untuk siswa ini' });
        }

        res.json({
            id: evaluation.id,
            title: evaluation.title,
            description: evaluation.description
        });
    } catch (error) {
        console.error("Error fetching evaluation details:", error);
        res.status(500).json({ error: error.message });
    }
});


// ✅ GET: Orang tua melihat nilai anak
router.get('/:id/subjects/:subjectId/assessments/:assessmentId/grades', accessValidation, roleValidation(["orang_tua"]), async (req, res) => {
    try {
        const { id, subjectId, assessmentId } = req.params;

        const scores = await Score.findAll({
            where: { student_id: id, assessment_id: assessmentId },
            attributes: ['date', 'title', 'score'],
            order: [['date', 'ASC']]
        });

        if (!scores.length) return res.status(404).json({ message: 'Tidak ada nilai untuk penilaian ini' });

        res.json(scores);
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
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
