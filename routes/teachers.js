const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const classController = require('../controllers/classController');
const attendanceController = require('../controllers/attendanceController');
const evaluationController = require('../controllers/evaluationController');
const gradeController = require('../controllers/gradeController');

// Middleware akses wali kelas
router.use(accessValidation, roleValidation(['wali_kelas']));

// 📘 Kelas & Jadwal
router.get('/my-class', classController.getMyClass);
router.get('/schedules', classController.getMySchedules);

// Attendance routes
router.get('/attendances', attendanceController.getAttendancesByDate);
router.post('/attendances', attendanceController.addAttendanceDate);
router.put('/attendances', attendanceController.updateAttendanceStatus);
router.delete('/attendances', attendanceController.deleteAttendanceByDate);

// Evaluasi
router.get('/semesters/:semester_id/evaluations', evaluationController.getEvaluationsBySemester);
router.post('/semesters/:semester_id/evaluations', evaluationController.createEvaluation);
router.put('/evaluations/:id', evaluationController.updateEvaluation);
router.delete('/evaluations/:id', evaluationController.deleteEvaluation);
router.get('/evaluations/:id', evaluationController.getStudentEvaluations);
router.put('/student-evaluations/:id', evaluationController.updateStudentEvaluation);

// Mata pelajaran
router.get('/grades/subjects', gradeController.getSubjectsByTeacherClass);

// Kategori penilaian
router.get('/grades/:subject_id/:semester_id/categories', gradeController.getGradeCategories);
router.post('/grades/:subject_id/:semester_id/categories', gradeController.createGradeCategory);
router.put('/grades/categories/:category_id', gradeController.updateGradeCategory);
router.delete('/grades/categories/:category_id', gradeController.deleteGradeCategory);

// Detail penilaian
router.get('/grades/categories/:category_id/details', gradeController.getGradeDetails);
router.post('/grades/categories/:category_id/details', gradeController.createGradeDetail);
router.put('/grades/details/:detail_id', gradeController.updateGradeDetail);
router.delete('/grades/details/:detail_id', gradeController.deleteGradeDetail);

// Nilai siswa
router.get('/grades/details/:detail_id/students', gradeController.getStudentScores);
router.patch('/grades/students/:student_grade_id', gradeController.updateStudentScore);
