const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const parentDashboard = require('../controllers/parentDashboardController');

// Middleware: Wajib login & role orang_tua
router.use(accessValidation, roleValidation(['orang_tua']));

// Routes
router.get('/student', parentDashboard.getStudentProfile);
router.get('/schedule', parentDashboard.getStudentSchedule);
router.get('/academic-calendar', parentDashboard.getAcademicCalendar);
router.get('/attendances/:semesterId', parentDashboard.getStudentAttendance);
router.get('/evaluations/:semesterId', parentDashboard.getStudentEvaluations);
router.get('/evaluations/:semesterId/:evaluationId', parentDashboard.getStudentEvaluationDetail);
router.get('/grades/:semesterId/subjects', parentDashboard.getStudentSubjects);
router.get('/grades/:semesterId/:subjectId/categories', parentDashboard.getGradeCategories);
router.get('/grades/categories/:gradeCategoryId/details', parentDashboard.getGradeDetails);

module.exports = router;
