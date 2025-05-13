const express = require('express');
const router = express.Router();
const classSumarryController = require('../controllers/classSummaryController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');

// Endpoint: Get all classes summary
router.get('/classes', accessValidation, roleValidation(["kepala_sekolah"]), classSumarryController.getAllClassesSummary);

// Endpoint: Get detail class
router.get('/classes/:classId', accessValidation, roleValidation(['kepala_sekolah']), classSumarryController.getDetailClassesSummary);

module.exports = router;