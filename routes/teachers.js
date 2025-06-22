const express = require('express');
const router = express.Router();
const attendanceController = require('./controllers/attendanceController');
const classController = require('./controllers/classController');
const evaluationController = require('./controllers/evaluationController');
const gradeController = require('./controllers/gradeController');
const scheduleController = require('./controllers/scheduleController');
const semesterController = require('./controllers/semesterController');

// My Class
router.get('/my-class', classController.getMyClass);

// Schedules
router.get('/schedules', scheduleController.getSchedules);

// Attendances
router.get('/attendances/rekap', attendanceController.getAttendanceDates);
router.get('/attendances', attendanceController.loadActiveSemester, attendanceController.getAttendances);
router.post('/attendances', attendanceController.loadActiveSemester, attendanceController.createAttendanceDate);
router.put('/attendances', attendanceController.loadActiveSemester, attendanceController.updateAttendances);
router.delete('/attendances', attendanceController.loadActiveSemester, attendanceController.deleteAttendances);

// Semesters
router.get('/semesters', semesterController.getSemesters);

// Evaluations
router.get('/semesters/:semester_id/evaluations', evaluationController.getEvaluations);
router.post('/semesters/:semester_id/evaluations', evaluationController.createEvaluation);
router.put('/evaluations/:id', evaluationController.updateEvaluation);
router.delete('/evaluations/:id', evaluationController.deleteEvaluation);
router.get('/evaluations/:id', evaluationController.getStudentEvaluations);
router.put('/student-evaluations/:id', evaluationController.updateStudentEvaluation);

// Grades
router.get('/grades/subjects', gradeController.getSubjects);
router.get('/grades/:subject_id/:semester_id/categories', gradeController.getCategories);
router.post('/grades/:subject_id/:semester_id/categories', gradeController.createCategory);
router.put('/grades/categories/:category_id', gradeController.updateCategory);
router.delete('/grades/categories/:category_id', gradeController.deleteCategory);
router.get('/grades/categories/:category_id/details', gradeController.getGradeDetails);
router.post('/grades/categories/:category_id/details', gradeController.createGradeDetail);
router.put('/grades/details/:detail_id', gradeController.updateGradeDetail);
router.delete('/grades/details/:detail_id', gradeController.deleteGradeDetail);
router.get('/grades/details/:detail_id/students', gradeController.getStudentGrades);
router.patch('/grades/students/:student_grade_id', gradeController.updateStudentGrade);

module.exports = router;