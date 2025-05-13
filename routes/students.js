const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

router.get('/', accessValidation, roleValidation(['admin']), studentController.getAllStudents);

router.post('/', accessValidation, roleValidation(['admin']), studentController.addStudent);

router.put('/:id', accessValidation, roleValidation(['admin']), studentController.updateStudent);
  
router.delete('/:id', accessValidation, roleValidation(['admin']), studentController.deleteStudent);

module.exports = router;