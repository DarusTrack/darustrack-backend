var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Subject, Grade, Student, Class, ClassSubject } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');

// ✅ GET: Daftar mata pelajaran berdasarkan kelas tertentu
router.get("/", async (req, res) => {
    try {
        const subjects = await Subject.findAll({
            attributes: ['id', 'name'] // ✅ Hanya menampilkan nama siswa
        });
        return res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error });
    }
});

// ✅ GET: Detail mata pelajaran + capaian pembelajaran
router.get("/:id", async (req, res) => {
    try {
        const subject = await Subject.findByPk(req.params.id);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        return res.json(subject);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subject", error });
    }
});
  
// Tambah mata pelajaran baru
router.post('/',  accessValidation, roleValidation(["admin", "orang_tua"]), async (req, res) => {
    const schema = {
        name: 'string',
        learning_goals: 'string'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    const subject = await Subject.create(req.body);
    res.json(subject);
});

// Update mata pelajaran
router.put('/:id',  accessValidation, roleValidation(["admin", "orang_tua"]),async (req, res) => {
    const id = req.params.id;

    let subject = await Subject.findByPk(id);
    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    const schema = {
        name: 'string|optional',
        learning_goals: 'string|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    subject = await subject.update(req.body);
    res.json(subject);
});

// Hapus mata pelajaran
router.delete('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const subject = await Subject.findByPk(id);

    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.destroy();
    res.json({ message: 'Subject is deleted' });
});

// **GET: Daftar penilaian di mata pelajaran**
router.get('/:id/assessments', accessValidation, async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Fetching assessments for subject ID:", id);

        // Cek apakah subject ada
        const subjectExists = await Subject.findByPk(id);
        if (!subjectExists) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        // Ambil daftar jenis penilaian dalam mata pelajaran
        const assessments = await Grade.findAll({
            where: { subject_id: id },
            attributes: ['id', 'type', 'description']
        });

        if (!assessments.length) {
            return res.status(404).json({ message: 'Tidak ada penilaian untuk mata pelajaran ini' });
        }

        res.json(assessments);
    } catch (error) {
        console.error("Error retrieving assessments:", error);
        res.status(500).json({ message: "Error retrieving assessments", error: error.message });
    }
});

router.post('/:subjectId/assessments', accessValidation, async (req, res) => {
    try {
        const { type, description, date } = req.body;
        const subjectId = req.params.subjectId;

        // ✅ Cek apakah mata pelajaran ada
        const subject = await Subject.findByPk(subjectId);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // ✅ Cari semua kelas yang terkait dengan mata pelajaran ini (Many-to-Many)
        const classSubjects = await ClassSubject.findAll({
            where: { subject_id: subjectId },
            attributes: ['class_id']
        });

        if (!classSubjects.length) {
            return res.status(404).json({ message: "No classes found for this subject" });
        }

        const classIds = classSubjects.map(cs => cs.class_id); // Ambil semua class_id terkait

        // ✅ Ambil semua siswa dari kelas-kelas yang ditemukan
        const students = await Student.findAll({
            where: { class_id: classIds },
            attributes: ['id', 'name']
        });

        if (students.length === 0) {
            return res.status(400).json({ message: "No students found in these classes" });
        }

        // ✅ Buat penilaian untuk setiap siswa dengan `score: null`
        const assessments = await Promise.all(
            students.map(student =>
                Grade.create({
                    student_id: student.id,
                    subject_id: subjectId,
                    type,
                    description,
                    date,
                    score: null  // Skor bisa di-update nanti
                })
            )
        );

        res.status(201).json({ message: "Assessment created successfully", assessments });
    } catch (error) {
        console.error("Error creating assessment:", error);
        res.status(500).json({ message: "Error creating assessment", error: error.message });
    }
});

// **PUT: Mengedit nama jenis penilaian**
router.put('/:id/assessments/:assessmentId', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const { assessmentId } = req.params;
    const assessment = await Grade.findByPk(assessmentId);

    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }

    const schema = {
        description: 'string|optional'
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    await assessment.update(req.body);
    res.json(assessment);
});

// **DELETE: Menghapus jenis penilaian**
router.delete('/:id/assessments/:assessmentId', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const { assessmentId } = req.params;
    const assessment = await Grade.findByPk(assessmentId);

    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }

    await assessment.destroy();
    res.json({ message: "Assessment deleted successfully" });
});

// **GET: Menampilkan detail dari jenis penilaian**
router.get('/:id/assessments/:assessmentId', accessValidation, async (req, res) => {
    const { assessmentId } = req.params;
    const assessment = await Grade.findByPk(assessmentId);

    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }

    // Jika UTS atau UAS, langsung tampilkan skor
    if (assessment.type === 'UTS' || assessment.type === 'UAS') {
        return res.json({
            id: assessment.id,
            type: assessment.type,
            description: assessment.description,
            date: assessment.date,
            score: assessment.score
        });
    }

    // Jika Quiz atau Tugas, tampilkan daftar siswa dengan skor null
    const students = await Student.findAll({
        where: { class_id: req.body.class_id }, // Harus diketahui kelasnya
        attributes: ['id', 'name']
    });

    const studentScores = students.map(student => ({
        student_id: student.id,
        name: student.name,
        score: null
    }));

    res.json({
        id: assessment.id,
        type: assessment.type,
        description: assessment.description,
        date: assessment.date,
        students: studentScores
    });
});

// **POST: Menambahkan macam-macam dari jenis penilaian**
router.post('/:id/assessments/:assessmentId', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const schema = {
        student_id: 'number',
        score: 'number|min:0|max:100',
        date: { type: 'date', convert: true }
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    const assessment = await Grade.create({
        subject_id: req.params.id,
        type: req.body.type,
        description: req.body.description,
        student_id: req.body.student_id,
        score: req.body.score,
        date: req.body.date
    });

    res.json(assessment);
});

// **GET: Menampilkan daftar siswa dan skor dari quiz tertentu**
router.get('/:subjectId/assessments/:assessmentId/scores', accessValidation, async (req, res) => {
    const { subjectId, assessmentId } = req.params;

    const grades = await Grade.findAll({
        where: { subject_id: subjectId, id: assessmentId },
        include: {
            model: Student,
            as: 'student',
            attributes: ['id', 'name']
        }
    });

    if (!grades.length) {
        return res.status(404).json({ message: "No scores found for this assessment" });
    }

    const response = grades.map(grade => ({
        student_id: grade.student.id,
        name: grade.student.name,
        score: grade.score
    }));

    res.json(response);
});

// **PUT: Mengupdate skor siswa pada penilaian tertentu**
router.put('/:subjectId/assessments/:assessmentId/scores/:studentId', accessValidation, roleValidation(["wali_kelas"]), async (req, res) => {
    const { assessmentId, studentId } = req.params;

    const assessment = await Grade.findOne({
        where: { id: assessmentId, student_id: studentId }
    });

    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found for this student" });
    }

    const schema = {
        score: 'number|min:0|max:100'
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    await assessment.update({ score: req.body.score });
    res.json({ message: "Score updated successfully" });
});

module.exports = router;
