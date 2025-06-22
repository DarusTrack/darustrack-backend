const express = require('express');
const router = express.Router();
const loadActiveSemester = require('../middlewares/loadActiveSemester');
const classCtrl = require('../controllers/classController');
const attendanceCtrl = require('../controllers/attendanceController');
const evalCtrl = require('../controllers/evaluationController');
const gradeCtrl = require('../controllers/gradeController');
const semesterCtrl = require('../controllers/semesterController');

// --- Kelas & Jadwal
router.get('/my-class', classCtrl.getMyClass);
router.get('/schedules', classCtrl.getSchedules);

// --- Kehadiran
router.get('/attendances/rekap', attendanceCtrl.rekapDates);
router.get('/attendances', loadActiveSemester, attendanceCtrl.listByDate);
router.post('/attendances', loadActiveSemester, attendanceCtrl.addDate);
router.put('/attendances', loadActiveSemester, attendanceCtrl.updateStatus);
router.delete('/attendances', loadActiveSemester, attendanceCtrl.removeByDate);

// --- Semester aktif
router.get('/semesters', semesterCtrl.getActiveSemesters);

// --- Evaluasi
router.get('/semesters/:semester_id/evaluations', evalCtrl.listTitles);
router.post('/semesters/:semester_id/evaluations', evalCtrl.createTitle);
router.put('/evaluations/:id', evalCtrl.updateTitle);
router.delete('/evaluations/:id', evalCtrl.deleteTitle);
router.get('/evaluations/:id', evalCtrl.listStudentEvaluations);
router.put('/student-evaluations/:id', evalCtrl.updateDescription);

// --- Nilai / Grades
router.get('/grades/subjects', gradeCtrl.listSubjects);
router.get('/grades/:subject_id/:semester_id/categories', gradeCtrl.listCategories);
router.post('/grades/:subject_id/:semester_id/categories', gradeCtrl.createCategory);
router.put('/grades/categories/:category_id', gradeCtrl.updateCategory);
router.delete('/grades/categories/:category_id', gradeCtrl.deleteCategory);
router.get('/grades/categories/:category_id/details', gradeCtrl.listDetails);
router.post('/grades/categories/:category_id/details', gradeCtrl.createDetail);
router.put('/grades/details/:detail_id', gradeCtrl.updateDetail);
router.delete('/grades/details/:detail_id', gradeCtrl.deleteDetail);
router.get('/grades/details/:detail_id/students', gradeCtrl.listStudentsForDetail);
router.patch('/grades/students/:student_grade_id', gradeCtrl.updateStudentGrade);

module.exports = router;
