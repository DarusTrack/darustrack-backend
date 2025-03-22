var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { AcademicCalendar } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const v = new Validator();

// Get semua jadwal akademik
router.get('/', accessValidation, async (req, res) => {
    const schedules = await AcademicCalendar.findAll();
    return res.json(schedules);
});

// Get jadwal akademik berdasarkan ID
router.get('/:id', accessValidation, async (req, res) => {
    const id = req.params.id;
    const schedule = await AcademicCalendar.findByPk(id);

    if (!schedule) {
        return res.status(404).json({ message: 'School Calendar not found' });
    }

    return res.json(schedule);
});

// Tambah jadwal akademik baru
router.post('/',  accessValidation, roleValidation(["orang_tua"]), async (req, res) => {
    const schema = {
        event_name: 'string',
        start_date: { type: 'date', convert: true },
        end_date: { type: 'date', convert: true, optional: true },
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    const schedule = await AcademicCalendar.create(req.body);
    res.json(schedule);
});

// Update jadwal akademik
router.put('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;

    let schedule = await AcademicCalendar.findByPk(id);
    if (!schedule) {
        return res.status(404).json({ message: 'School Calendar not found' });
    }

    const schema = {
        event_name: 'string|optional',
        start_date: { type: 'date', convert: true, optional: true },
        end_date: { type: 'date', convert: true, optional: true },
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    schedule = await schedule.update(req.body);
    res.json(schedule);
});

// Hapus jadwal akademik
router.delete('/:id',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    const schedule = await AcademicCalendar.findByPk(id);

    if (!schedule) {
        return res.status(404).json({ message: 'School Calendar not found' });
    }

    await schedule.destroy();
    res.json({ message: 'School Calendar is deleted' });
});

module.exports = router;
