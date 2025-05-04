const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const {
  getClasses,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/classController');

// Kelas & Jadwal
router.get('/', accessValidation, roleValidation(['admin']), getClasses);
router.get('/:class_id/schedule', accessValidation, roleValidation(['admin']), getSchedule);
router.post('/:class_id/schedule', accessValidation, roleValidation(['admin']), createSchedule);
router.put('/schedule/:schedule_id', accessValidation, roleValidation(['admin']), updateSchedule);
router.delete('/schedule/:schedule_id', accessValidation, roleValidation(['admin']), deleteSchedule);

module.exports = router;
