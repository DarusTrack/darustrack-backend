const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

router.get('/', 
    accessValidation, 
    roleValidation(['admin']), 
    classController.getAllClasses
);

router.get('/', 
    accessValidation, 
    roleValidation(['wali_kelas']), 
    classController.getMyClass
);

router.get('/:class_id/schedule', 
    accessValidation, 
    roleValidation(["admin"]), 
    classController.getClassSchedules
);

router.post('/:class_id/schedule', 
    accessValidation, 
    roleValidation(["admin"]), 
    classController.addSchedule
);

router.put('/schedule/:schedule_id', 
    accessValidation, 
    roleValidation(["admin"]), 
    classController.updateSchedule
);

router.delete('/schedule/:schedule_id', 
    accessValidation, 
    roleValidation(["admin"]), 
    classController.deleteSchedule
);

module.exports = router;