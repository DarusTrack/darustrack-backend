const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');

const {
  getSemestersOfActiveAcademicYear
} = require('../controllers/semesterController');

router.get('/', accessValidation, getSemestersOfActiveAcademicYear);

module.exports = router;
