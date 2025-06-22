const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculumController');
const roleValidation = require('../middlewares/roleValidation');
const cacheMiddleware = require('../middlewares/cacheMiddleware');

// Get data kurikulum (hanya satu yang tersedia)
router.get('/', cacheMiddleware(300), curriculumController.getCurriculum);

router.put('/:id', roleValidation(["admin"]), curriculumController.updateCurriculum);

module.exports = router;