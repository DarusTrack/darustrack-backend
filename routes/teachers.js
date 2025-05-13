const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const attendanceController = require('../controllers/attendanceController');
const evaluationController = require('../controllers/evaluationController');
const gradeController = require('../controllers/gradeController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Kelas & Jadwal
router.get('/my-class', 
  accessValidation, 
  roleValidation(["wali_kelas"]), 
  teacherController.getMyClass
);

router.get('/schedules', 
  accessValidation, 
  roleValidation(["wali_kelas"]), 
  teacherController.getSchedules
);

module.exports = router;