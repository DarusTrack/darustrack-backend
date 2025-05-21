const express = require('express');
const router = express.Router();
const HomeroomController = require('../controllers/homeroomController');
const AttendanceController = require('../controllers/attendanceController');
const EvaluationController = require('../controllers/evaluationController');
const GradeController = require('../controllers/gradeController');

// Helper error wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Homeroom routes
router.get('/my-class', asyncHandler(HomeroomController.getMyClass));
router.get('/schedules', asyncHandler(HomeroomController.getSchedules));

// Attendance routes
router.get('/attendances/rekap', asyncHandler(AttendanceController.getAttendanceDates));
router.get('/attendances', HomeroomController.loadActiveSemester, asyncHandler(AttendanceController.getAttendances));
router.post('/attendances', HomeroomController.loadActiveSemester, asyncHandler(AttendanceController.createAttendance));
router.put('/attendances', HomeroomController.loadActiveSemester, asyncHandler(AttendanceController.updateAttendance));
router.delete('/attendances', HomeroomController.loadActiveSemester, asyncHandler(AttendanceController.deleteAttendance));

// Evaluation routes
router.get('/semesters', asyncHandler(HomeroomController.getSemesters));
router.get('/semesters/:semester_id/evaluations', asyncHandler(EvaluationController.getEvaluationsBySemester));
router.post('/semesters/:semester_id/evaluations', asyncHandler(EvaluationController.createEvaluation));
router.put('/evaluations/:id', asyncHandler(EvaluationController.updateEvaluation));
router.delete('/evaluations/:id', asyncHandler(EvaluationController.deleteEvaluation));
router.get('/evaluations/:id', asyncHandler(EvaluationController.getStudentEvaluations));
router.put('/student-evaluations/:id', asyncHandler(EvaluationController.updateStudentEvaluation));

// Grade routes
router.get('/grades/subjects', asyncHandler(GradeController.getSubjectsForGrading));
router.get('/grades/:subject_id/:semester_id/categories', asyncHandler(GradeController.getGradeCategories));
router.post('/grades/:subject_id/:semester_id/categories', asyncHandler(GradeController.createGradeCategory));
router.put('/grades/categories/:category_id', asyncHandler(GradeController.updateGradeCategory));
router.delete('/grades/categories/:category_id', asyncHandler(GradeController.deleteGradeCategory));
router.get('/grades/categories/:category_id/details', asyncHandler(GradeController.getGradeDetails));
router.post('/grades/categories/:category_id/details', asyncHandler(GradeController.createGradeDetail));
router.put('/grades/details/:detail_id', asyncHandler(GradeController.updateGradeDetail));
router.delete('/grades/details/:detail_id', asyncHandler(GradeController.deleteGradeDetail));
router.get('/grades/details/:detail_id/students', asyncHandler(GradeController.getStudentGrades));
router.patch('/grades/students/:student_grade_id', asyncHandler(GradeController.updateStudentGrade));

module.exports = router;