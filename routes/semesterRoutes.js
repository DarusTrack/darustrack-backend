const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');

// Get active semesters
router.get('/',  cacheMiddleware(300), semesterController.getActiveSemesters);

module.exports = router;