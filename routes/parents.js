const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const attendanceController = require('../controllers/attendanceController');
const evaluationController = require('../controllers/evaluationController');
const gradeController = require('../controllers/gradeController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

router.use(accessValidation, roleValidation(['orang_tua']));

// Profil Siswa
router.get('/student', parentController.getStudentProfile);

// Jadwal Pelajaran
router.get('/schedule', parentController.getStudentSchedule);

// Kehadiran
router.get('/attendances/:semesterId', attendanceController.getStudentAttendances);

// Evaluasi
router.get('/evaluations/:semesterId', evaluationController.getStudentTitleEvaluation);
router.get('/evaluations/:semesterId/:evaluationId', evaluationController.getStudentDescEvaluation);

// Nilai
router.get('/grades/:semesterId/subjects', gradeController.getStudentSubjectGrades);
router.get('/grades/:semesterId/:subjectId/categories', gradeController.getStudentCategorySubject);
router.get('/grades/categories/:gradeCategoryId/details', gradeController.getStudentDetailCategory);

module.exports = router;