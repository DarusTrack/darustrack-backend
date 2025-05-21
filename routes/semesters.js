const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');

// Daftar semester tahun ajaran aktif (kehadiran dan evaluasi)
router.get('/', semesterController.getAllSemesters);

module.exports = router