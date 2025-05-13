const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');
const classController = require('../controllers/classController');
const enrollmentController = require('../controllers/enrollmentController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Academic Years
router.get('/', 
    accessValidation, 
    roleValidation(["admin"]), 
    academicYearController.getAllAcademicYears
);

router.post('/',
    accessValidation,
    roleValidation(["admin"]),
    academicYearController.createAcademicYear
);

router.put('/:id',
    accessValidation,
    roleValidation(["admin"]),
    academicYearController.updateAcademicYear
);

router.delete('/:id',
    accessValidation,
    academicYearController.deleteAcademicYear
);

// Semesters
router.put('/semester/:id',
    accessValidation,
    roleValidation(["admin"]),
    academicYearController.updateSemesterStatus
);

// Classes
router.get('/:id/classes',
    accessValidation,
    roleValidation(["admin"]),
    classController.getClassesByAcademicYear
);

router.post('/:id/classes',
    accessValidation,
    roleValidation(["admin"]),
    classController.createClassInAcademicYear
);

router.put('/classes/:classId',
    accessValidation,
    roleValidation(["admin"]),
    classController.updateClass
);

router.delete('/classes/:classId',
    accessValidation,
    roleValidation(["admin"]),
    classController.deleteClass
);

// Student Enrollments
router.get('/:academicYearId/classes/:classId/students',
    accessValidation,
    roleValidation(["admin"]),
    enrollmentController.getClassStudents
);

router.post('/:academicYearId/classes/:classId/students',
    accessValidation,
    roleValidation(["admin"]),
    enrollmentController.addStudentsToClass
);

router.delete('/:academicYearId/classes/:classId/students/:studentId',
    accessValidation,
    roleValidation(["admin"]),
    enrollmentController.removeStudentFromClass
);

module.exports = router;