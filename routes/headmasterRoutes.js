const express = require('express');
const router = express.Router();
const classSumarryController = require('../controllers/classSummaryController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');

// Endpoint: Get all classes summary
router.get('/classes', cacheMiddleware(120), classSumarryController.getAllClassesSummary);

// Endpoint: Get detail class
router.get('/classes/:classId', cacheMiddleware(60), classSumarryController.getDetailClassesSummary);

module.exports = router;