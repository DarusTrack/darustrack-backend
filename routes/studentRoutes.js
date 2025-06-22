const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const cacheMiddleware = require('./middlewares/cacheMiddleware');

// Student routes
router.get('/',  cacheMiddleware(120), StudentController.getAllStudents);
router.post('/', StudentController.createStudent);
router.put('/:id', StudentController.updateStudent);
router.delete('/:id', StudentController.deleteStudent);

module.exports = router;