const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Daftar semester tahun ajaran aktif (kehadiran dan evaluasi)
router.get('/', accessValidation, semesterController.getAllSemesters);

module.exports = router