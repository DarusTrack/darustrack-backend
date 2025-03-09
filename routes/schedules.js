var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Schedule, Class, Subject } = require('../models');
const { Op } = require('sequelize');
const v = new Validator();

// Get semua jadwal pelajaran (dengan filter opsional)
router.get('/', async (req, res) => {
    const { class_id, subject_id, day } = req.query;

    // Buat objek filter berdasarkan parameter yang diberikan
    let whereClause = {};
    if (class_id) whereClause.class_id = class_id;
    if (subject_id) whereClause.subject_id = subject_id;
    if (day) whereClause.day = day;

    try {
        const schedules = await Schedule.findAll({
            where: whereClause,
            include: [
                { model: Class, as: 'class', attributes: ['id', 'name'] },
                { model: Subject, as: 'subject', attributes: ['id', 'name'] }
            ]
        });

        return res.json(schedules);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving schedules', error });
    }
});

// Get jadwal pelajaran berdasarkan ID
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const schedule = await Schedule.findByPk(id, {
        include: [
            { model: Class, as: 'class', attributes: ['id', 'name'] },
            { model: Subject, as: 'subject', attributes: ['id', 'name'] }
        ]
    });

    if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
    }

    return res.json(schedule);
});

// Fungsi untuk mengecek bentrokan jadwal
async function isScheduleConflict(class_id, day, start_time, end_time, excludeId = null) {
    const whereClause = {
        class_id,
        day,
        [Op.or]: [
            {
                start_time: { [Op.lt]: end_time },
                end_time: { [Op.gt]: start_time }
            },
            {
                start_time: { [Op.between]: [start_time, end_time] }
            },
            {
                end_time: { [Op.between]: [start_time, end_time] }
            },
            {
                start_time: { [Op.lte]: start_time },
                end_time: { [Op.gte]: end_time }
            }
        ]
    };

    if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
    }

    return await Schedule.findOne({ where: whereClause }) !== null;
}

// Tambah jadwal pelajaran baru
router.post('/', async (req, res) => {
    const schema = {
        class_id: 'number',
        subject_id: 'number',
        day: { type: 'enum', values: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] },
        start_time: 'string',
        end_time: 'string'
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    const { class_id, day, start_time, end_time } = req.body;

    if (start_time >= end_time) {
        return res.status(400).json({ message: 'Start time must be earlier than end time' });
    }

    if (await isScheduleConflict(class_id, day, start_time, end_time)) {
        return res.status(400).json({ message: 'Schedule conflicts with another subject at the same time' });
    }

    const schedule = await Schedule.create(req.body);
    res.json(schedule);
});

// Update jadwal pelajaran
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    let schedule = await Schedule.findByPk(id);

    if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
    }

    const schema = {
        class_id: 'number|optional',
        subject_id: 'number|optional',
        day: { type: 'enum', values: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], optional: true },
        start_time: 'string|optional',
        end_time: 'string|optional'
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
        return res.status(400).json(validate);
    }

    const { class_id = schedule.class_id, day = schedule.day, start_time = schedule.start_time, end_time = schedule.end_time } = req.body;

    if (start_time >= end_time) {
        return res.status(400).json({ message: 'Start time must be earlier than end time' });
    }

    if (await isScheduleConflict(class_id, day, start_time, end_time, id)) {
        return res.status(400).json({ message: 'Schedule conflicts with another subject at the same time' });
    }

    schedule = await schedule.update(req.body);
    res.json(schedule);
});

// Hapus jadwal pelajaran
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    const schedule = await Schedule.findByPk(id);

    if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
    }

    await schedule.destroy();
    res.json({ message: 'Schedule is deleted' });
});

module.exports = router;
