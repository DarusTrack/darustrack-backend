const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

router.get('/', accessValidation, roleValidation(['admin']), getAllStudents);
router.post('/', accessValidation, roleValidation(['admin']), createStudent);
router.put('/:id', accessValidation, roleValidation(['admin']), updateStudent);
router.delete('/:id', accessValidation, roleValidation(['admin']), deleteStudent);

module.exports = router;
