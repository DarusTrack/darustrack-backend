const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const {
  getClassSummaries,
  getClassDetail
} = require('../controllers/classSummaryController');

router.get('/classes', accessValidation, roleValidation(['kepala_sekolah']), getClassSummaries);
router.get('/classes/:classId', accessValidation, roleValidation(['kepala_sekolah']), getClassDetail);

module.exports = router;
