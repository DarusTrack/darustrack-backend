const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculumController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Get data kurikulum (hanya satu yang tersedia)
router.get('/', accessValidation, curriculumController.getCurriculum);

router.put('/:id', accessValidation, roleValidation(["admin"]), curriculumController.updateCurriculum);

module.exports = router;