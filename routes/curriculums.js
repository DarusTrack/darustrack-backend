const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const {
  getCurriculum,
  updateCurriculum
} = require('../controllers/curriculumController');

router.get('/', accessValidation, getCurriculum);
router.put('/:id', accessValidation, roleValidation(['admin']), updateCurriculum);

module.exports = router;
