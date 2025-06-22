const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');
const semesterController = require('../controllers/semesterController');
const classController = require('../controllers/classController');
const studentClassController = require('../controllers/studentClassController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');

// Academic Year Routes
router.get('/',  cacheMiddleware(300), academicYearController.getAllAcademicYears);
router.post('/', academicYearController.createAcademicYear);
router.put('/:id', academicYearController.updateAcademicYear);
router.delete('/:id', academicYearController.deleteAcademicYear);

// Semester Routes
router.put('/semester/:id', semesterController.updateSemesterStatus);

// Class Routes
router.get('/:id/classes',  cacheMiddleware(120), classController.getClassesByAcademicYear);
router.post('/:id/classes', classController.createClass);
router.put('/classes/:classId', classController.updateClass);
router.delete('/classes/:classId', classController.deleteClass);

// Student-Class Routes
router.get('/:academicYearId/classes/:classId/students', studentClassController.getStudentsInClass);
router.post('/:academicYearId/classes/:classId/students', studentClassController.addStudentsToClass);
router.delete('/:academicYearId/classes/:classId/students/:studentId', studentClassController.removeStudentFromClass);

module.exports = router;