var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { SchoolCalendar } = require('../models');
const v = new Validator();

// Get semua jadwal akademik
router.get('/', async (req, res) => {
    const schedules = await SchoolCalendar.findAll();
    return res.json(schedules);
});

// Get jadwal akademik berdasarkan ID
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const schedule = await SchoolCalendar.findByPk(id);

    if (!schedule) {
        return res.status(404).json({ message: 'School Calendar not found' });
    }

    return res.json(schedule);
});

// Tambah jadwal akademik baru
router.post('/', async (req, res) => {
    const schema = {
        event_name: 'string',
        event_start: { type: 'date', convert: true },
        event_end: { type: 'date', convert: true, optional: true },
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    // Konversi string tanggal menjadi objek Date
    const eventStart = new Date(req.body.event_start);
    const eventEnd = req.body.event_end ? new Date(req.body.event_end) : null;

    // Cek apakah event_start dan event_end sama
    if (eventEnd && eventStart.getTime() === eventEnd.getTime()) {
        return res.status(400).json({
            message: "event_start and event_end cannot be the same date."
        });
    }

    const schedule = await SchoolCalendar.create(req.body);
    res.json(schedule);
});

// Update jadwal akademik
router.put('/:id', async (req, res) => {
    const id = req.params.id;

    let schedule = await SchoolCalendar.findByPk(id);
    if (!schedule) {
        return res.status(404).json({ message: 'School Calendar not found' });
    }

    const schema = {
        event_name: 'string|optional',
        event_start: { type: 'date', convert: true, optional: true },
        event_end: { type: 'date', convert: true, optional: true },
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    // Konversi string tanggal menjadi objek Date
    const eventStart = req.body.event_start ? new Date(req.body.event_start) : new Date(schedule.event_start);
    const eventEnd = req.body.event_end ? new Date(req.body.event_end) : (schedule.event_end ? new Date(schedule.event_end) : null);

    // Cek apakah event_start dan event_end sama setelah update
    if (eventEnd && eventStart.getTime() === eventEnd.getTime()) {
        return res.status(400).json({
            message: "event_start and event_end cannot be the same date."
        });
    }

    schedule = await schedule.update(req.body);
    res.json(schedule);
});

// Hapus jadwal akademik
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    const schedule = await SchoolCalendar.findByPk(id);

    if (!schedule) {
        return res.status(404).json({ message: 'School Calendar not found' });
    }

    await schedule.destroy();
    res.json({ message: 'School Calendar is deleted' });
});

module.exports = router;
