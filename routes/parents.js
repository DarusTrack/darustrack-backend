const express = require('express');
const router = express.Router();
const parentCtrl = require('../controllers/parentController');

router.get('/student', parentCtrl.profile);
router.get('/schedule', parentCtrl.schedule);
router.get('/attendances/:semesterId', parentCtrl.attendances);

router.get('/evaluations/:semesterId', parentCtrl.evaluationTitles);
router.get('/evaluations/:semesterId/:evaluationId', parentCtrl.evaluationDetail);

router.get('/grades/:semesterId/subjects', parentCtrl.subjects);
router.get('/grades/:semesterId/:subjectId/categories', parentCtrl.categories);
router.get('/grades/categories/:gradeCategoryId/details', parentCtrl.detailScores);

module.exports = router;
