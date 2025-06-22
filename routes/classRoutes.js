const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const scheduleController = require('../controllers/scheduleController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');

// Class routes
router.get('/',  cacheMiddleware(120), classController.getActiveClasses);

// Schedule routes
router.get('/:class_id/schedule',  cacheMiddleware(120), scheduleController.getClassSchedules);
router.post('/:class_id/schedule', scheduleController.createSchedule);
router.put('/schedule/:schedule_id', scheduleController.updateSchedule);
router.delete('/schedule/:schedule_id', scheduleController.deleteSchedule);

module.exports = router;