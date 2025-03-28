const express = require('express');
const router = express.Router();
const { Op } = require('sequelize')
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

// // Menambahkan Mata Pelajaran ke Kelas (Hanya yang Terdaftar di Schedule)
// router.post('/grades', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
//     try {
//         const { subject_id } = req.body;
//         const classId = req.user.class_id;

//         if (!subject_id) {
//             return res.status(400).json({ message: 'Subject ID harus diisi' });
//         }

//         // Cek apakah subject_id valid dan ada di jadwal kelas ini
//         const isSubjectScheduled = await Schedule.findOne({
//             where: { class_id: classId, subject_id }
//         });

//         if (!isSubjectScheduled) {
//             return res.status(400).json({ message: 'Subject ini tidak terdaftar dalam jadwal kelas' });
//         }

//         // Cek apakah subject sudah ada di daftar grade kelas
//         const existingGrade = await Grade.findOne({ where: { class_id: classId, subject_id } });
//         if (existingGrade) {
//             return res.status(400).json({ message: 'Mata pelajaran sudah ada di kelas ini' });
//         }

//         // Tambahkan subject ke kelas
//         const newGrade = await Grade.create({ class_id: classId, subject_id });

//         res.status(201).json({
//             message: 'Mata pelajaran berhasil ditambahkan ke kelas',
//             grade: newGrade
//         });
//     } catch (error) {
//         console.error("Error adding subject to class:", error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// });

// // Mengedit Mata Pelajaran dalam Kelas (Hanya Bisa Mengubah ke Subject yang Terjadwal)
// router.put('/grades/:gradeId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
//     try {
//         const { gradeId } = req.params;
//         const { subject_id } = req.body;
//         const classId = req.user.class_id;

//         if (!subject_id) {
//             return res.status(400).json({ message: 'Subject ID baru harus diisi' });
//         }

//         // Cek apakah mata pelajaran ada dalam daftar grade kelas ini
//         const existingGrade = await Grade.findByPk(gradeId);
//         if (!existingGrade) {
//             return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan di kelas ini' });
//         }

//         // Cek apakah subject baru ada dalam jadwal kelas ini
//         const isSubjectScheduled = await Schedule.findOne({
//             where: { class_id: classId, subject_id }
//         });

//         if (!isSubjectScheduled) {
//             return res.status(400).json({ message: 'Subject ini tidak terdaftar dalam jadwal kelas' });
//         }

//         // Cek apakah subject baru sudah ada di daftar grade kelas
//         const duplicateGrade = await Grade.findOne({
//             where: { class_id: classId, subject_id }
//         });

//         if (duplicateGrade && duplicateGrade.id !== parseInt(gradeId)) {
//             return res.status(400).json({ message: 'Mata pelajaran ini sudah ada di kelas ini' });
//         }

//         // Update mata pelajaran
//         existingGrade.subject_id = subject_id;
//         await existingGrade.save();

//         res.json({
//             message: 'Mata pelajaran berhasil diperbarui',
//             grade: existingGrade
//         });
//     } catch (error) {
//         console.error("Error updating subject in class:", error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// });

// // Menghapus Mata Pelajaran dari Kelas
// router.delete('/grades/:gradeId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
//     try {
//         const { gradeId } = req.params;

//         // Cek apakah mata pelajaran ada
//         const grade = await Grade.findByPk(gradeId);
//         if (!grade) {
//             return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan di kelas ini' });
//         }

//         // Hapus data dari database
//         await grade.destroy();

//         res.json({ message: 'Mata pelajaran berhasil dihapus dari kelas' });
//     } catch (error) {
//         console.error("Error deleting subject from class:", error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// });

// daftar penilaian mata pelajaran
router.get('/grades/:gradeId/assessments', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { gradeId } = req.params;

        // Ambil daftar penilaian berdasarkan grade_id
        const assessments = await Assessment.findAll({
            where: { grade_id: gradeId },
            attributes: ['id', 'name'] // Ambil hanya id dan name
        });

        res.json(assessments);
    } catch (error) {
        console.error("Error fetching assessments:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// tambah daftar penilaian mata pelajaran
router.post('/grades/:gradeId/assessments', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { gradeId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name harus diisi' });
        }

        // Cek apakah assessment dengan nama yang sama sudah ada untuk grade yang sama
        const existingAssessment = await Assessment.findOne({
            where: { grade_id: gradeId, name }
        });

        if (existingAssessment) {
            return res.status(400).json({ message: 'Penilaian dengan nama ini sudah ada untuk mata pelajaran ini' });
        }

        // Tambahkan penilaian ke mata pelajaran (grade)
        const newAssessment = await Assessment.create({
            grade_id: gradeId,
            name
        });

        res.status(201).json({ message: 'Penilaian berhasil ditambahkan', assessmentGrade: newAssessment });
    } catch (error) {
        console.error("Error adding assessment:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// edit daftar penilaian mapel
router.put('/grades/:gradeId/assessments/:assessmentId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { gradeId, assessmentId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nama penilaian harus diisi' });
        }

        // Cari penilaian berdasarkan ID dan kelas terkait
        const assessment = await Assessment.findOne({ where: { id: assessmentId, grade_id: gradeId } });

        if (!assessment) {
            return res.status(404).json({ message: 'Penilaian tidak ditemukan' });
        }

        // Update nama penilaian
        assessment.name = name;
        await assessment.save();

        res.json({ message: 'Penilaian berhasil diperbarui', assessment });
    } catch (error) {
        console.error("Error updating assessment:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// hapus daftar penilaian mapel
router.delete('/grades/:gradeId/assessments/:assessmentId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { gradeId, assessmentId } = req.params;

        // Cari penilaian berdasarkan ID dan kelas terkait
        const assessment = await Assessment.findOne({ where: { id: assessmentId, grade_id: gradeId } });

        if (!assessment) {
            return res.status(404).json({ message: 'Penilaian tidak ditemukan' });
        }

        // Hapus penilaian
        await assessment.destroy();

        res.json({ message: 'Penilaian berhasil dihapus' });
    } catch (error) {
        console.error("Error deleting assessment:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// daftar macam-macam Assessment Type dari suatu Assessment
router.get('/grades/:gradeId/assessments/:assessmentId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { assessmentId } = req.params;

        // Ambil daftar assessment types berdasarkan assessmentId
        const assessmentTypes = await AssessmentType.findAll({
            where: { assessment_id: assessmentId },
            attributes: ['id', 'name', 'date'],
            include: [
                {
                    model: Assessment,
                    as: 'assessment',
                    attributes: ['name']
                }
            ]
        });

        if (!assessmentTypes.length) {
            return res.status(404).json({ message: 'Tidak ada assessment type untuk assessment ini' });
        }

        res.json(assessmentTypes);
    } catch (error) {
        console.error("Error fetching assessment types:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update Assessment Type
router.put('/grades/:gradeId/assessments/:assessmentId/types/:typeId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { assessmentId, typeId } = req.params;
        const { name, date } = req.body;

        // Pastikan setidaknya ada satu field yang diperbarui
        if (!name && !date) {
            return res.status(400).json({ message: 'Setidaknya satu field (name atau date) harus diisi' });
        }

        // Cek apakah nama baru sudah digunakan oleh Assessment lain di dalam assessment yang sama
        if (name) {
            const existingType = await AssessmentType.findOne({
                where: {
                    assessment_id: assessmentId,
                    name,
                    id: { [Op.ne]: typeId } // Hindari pengecekan terhadap dirinya sendiri
                }
            });

            if (existingType) {
                return res.status(409).json({ message: 'Nama sudah digunakan oleh assessment lain' });
            }
        }

        // Simpan data yang akan diperbarui
        let fieldsToUpdate = {};
        if (name) fieldsToUpdate.name = name;
        if (date) fieldsToUpdate.date = new Date(date); // Pastikan format date valid

        // Perbarui Assessment Type
        const updated = await AssessmentType.update(fieldsToUpdate, { where: { id: typeId, assessment_id: assessmentId } });

        if (!updated[0]) {
            return res.status(404).json({ message: 'Assessment type tidak ditemukan' });
        }

        res.json({ message: 'Assessment type berhasil diperbarui' });
    } catch (error) {
        console.error("Error updating assessment type:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Hapus Assessment Type
router.delete('/grades/:gradeId/assessments/:assessmentId/types/:typeId', accessValidation, roleValidation(['wali_kelas']), async (req, res) => {
    try {
        const { typeId } = req.params;

        // Cek apakah assessment type memiliki StudentScore
        const hasScores = await StudentScore.findOne({ where: { assessment_type_id: typeId } });
        if (hasScores) {
            return res.status(400).json({ message: 'Tidak dapat menghapus, assessment type sudah digunakan' });
        }

        // Hapus assessment type
        const deleted = await AssessmentType.destroy({ where: { id: typeId } });

        if (!deleted) {
            return res.status(404).json({ message: 'Assessment type tidak ditemukan' });
        }

        res.json({ message: 'Assessment type berhasil dihapus' });
    } catch (error) {
        console.error("Error deleting assessment type:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Endpoint untuk menambahkan assessment type
router.post('/grades/:gradeId/assessments/:assessmentId/types', async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { name, date } = req.body;

        if (!name || !date) {
            return res.status(400).json({ message: "Name dan date harus diisi" });
        }

        const newAssessmentType = await AssessmentType.create({
            assessment_id: assessmentId,
            name,
            date: new Date(date)
        });

        res.status(201).json({
            id: newAssessmentType.id,
            assessment_id: newAssessmentType.assessment_id,
            name: newAssessmentType.name,
            date: newAssessmentType.date
        });
    } catch (error) {
        console.error("Error adding assessment type:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Endpoint untuk mendapatkan detail assessment type & daftar siswa beserta skornya
router.get('/grades/:gradeId/assessments/:assessmentId/types/:typeId', async (req, res) => {
    try {
        const { gradeId, assessmentId, typeId } = req.params;

        // Ambil informasi assessment type
        const assessmentType = await AssessmentType.findByPk(typeId, {
            attributes: ['id', 'assessment_id', 'name', 'date']
        });

        if (!assessmentType) {
            return res.status(404).json({ message: 'Assessment type not found' });
        }

        // Ambil daftar siswa dalam kelas beserta skornya
        const students = await Student.findAll({
            where: { class_id: gradeId },
            attributes: ['id', 'name'],
            include: [
                {
                    model: StudentScore,
                    as: 'student_scores',
                    required: false, // LEFT JOIN agar siswa tetap muncul meskipun belum ada skor
                    where: { assessment_type_id: typeId },
                    attributes: ['score']
                }
            ]
        });

        // Pastikan setiap siswa memiliki skor (null jika tidak ada skor)
        const formattedStudents = students.map(student => ({
            id: student.id,
            name: student.name,
            score: student.student_scores?.[0]?.score ?? null // Jika tidak ada skor, default ke null
        }));

        res.status(200).json({
            assessment_id: assessmentType.assessment_id,
            name: assessmentType.name,
            date: assessmentType.date,
            students: formattedStudents
        });
    } catch (error) {
        console.error('Error fetching assessment type details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Endpoint untuk mengupdate skor siswa
router.put('/grades/:gradeId/assessments/:assessmentId/types/:typeId/scores/:studentId', accessValidation, roleValidation(['wali_kelas']), 
    async (req, res) => {
        try {
            const { typeId, studentId } = req.params;
            const { score } = req.body;

            // Validasi skor harus dalam rentang 0 - 100
            if (score === undefined || score < 0 || score > 100) {
                return res.status(400).json({ message: 'Skor harus antara 0-100' });
            }

            // Cek apakah skor sudah ada untuk siswa ini pada assessment type ini
            let studentScore = await StudentScore.findOne({ 
                where: { student_id: studentId, assessment_type_id: typeId } 
            });

            if (!studentScore) {
                // Jika skor belum ada, buat baru
                studentScore = await StudentScore.create({
                    student_id: studentId,
                    assessment_type_id: typeId,
                    score: score
                });
            } else {
                // Jika sudah ada, update skor yang lama
                studentScore.score = score;
                await studentScore.save();
            }

            res.json({ message: 'Skor berhasil diperbarui', studentScore });
        } catch (error) {
            console.error("Error updating student score:", error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
);

module.exports = router