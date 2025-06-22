const express = require('express');
const router = express.Router();

const subjectCtrl = require('../controllers/subjectController');
const roleValidation = require('../middlewares/roleValidation');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const asyncHandler = require('../middlewares/asyncHandler');

// 🚀 GET list & detail — cache 300 s
router.get('/', cacheMiddleware(300), asyncHandler(subjectCtrl.listSubjects));
router.get('/:id', cacheMiddleware(300), asyncHandler(subjectCtrl.getSubject));

// 🔐 Admin-only write actions
router.post('/', roleValidation(['admin']), asyncHandler(subjectCtrl.createSubject));
router.put('/:id', roleValidation(['admin']), asyncHandler(subjectCtrl.updateSubject));
router.delete('/:id', roleValidation(['admin']), asyncHandler(subjectCtrl.deleteSubject));

module.exports = router;
