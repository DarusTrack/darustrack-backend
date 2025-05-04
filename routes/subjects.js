const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');

router.get('/', accessValidation, getAllSubjects);
router.get('/:id', accessValidation, getSubjectById);
router.post('/', accessValidation, roleValidation(['admin']), createSubject);
router.put('/:id', accessValidation, roleValidation(['admin']), updateSubject);
router.delete('/:id', accessValidation, roleValidation(['admin']), deleteSubject);

module.exports = router;
