const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Import semua fungsi dari controller
const {
  getAllAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  activateSemester,
  getClassesByAcademicYear,
  createClass,
  updateClass,
  deleteClass,
  getStudentsByClass,
  addStudentsToClass,
  removeStudentFromClass
} = require('../controllers/academicYearController');

// ===================== TAHUN AJARAN =====================
router.get('/', accessValidation, roleValidation(["admin"]), getAllAcademicYears);
router.post('/', accessValidation, roleValidation(["admin"]), createAcademicYear);
router.put('/:id', accessValidation, roleValidation(["admin"]), updateAcademicYear);
router.delete('/:id', accessValidation, roleValidation(["admin"]), deleteAcademicYear);

// ===================== SEMESTER =====================
router.put('/semester/:id', accessValidation, roleValidation(["admin"]), activateSemester);

// ===================== KELAS =====================
router.get('/:id/classes', accessValidation, roleValidation(["admin"]), getClassesByAcademicYear);
router.post('/:id/classes', accessValidation, roleValidation(["admin"]), createClass);
router.put('/classes/:classId', accessValidation, roleValidation(["admin"]), updateClass);
router.delete('/classes/:classId', accessValidation, roleValidation(["admin"]), deleteClass);

// ===================== SISWA =====================
router.get('/:academicYearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), getStudentsByClass);
router.post('/:academicYearId/classes/:classId/students', accessValidation, roleValidation(["admin"]), addStudentsToClass);
router.delete('/:academicYearId/classes/:classId/students/:studentId',  roleValidation(["admin"]), removeStudentFromClass);

module.exports = router;