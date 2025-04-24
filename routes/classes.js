const express = require('express');
const router = express.Router();
const { Class, Student, User, Schedule, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op } = require('sequelize');

// Get semua kelas dengan filter grade level
router.get('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { grade_level } = req.query;
    const whereClause = grade_level ? { grade_level } : {};
    try {
        const classes = await Class.findAll({ where: whereClause });
        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching classes', error });
    }
});

// Tambah kelas
router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { name, grade_level, teacher_id } = req.body;
        const newClass = await Class.create({ name, grade_level, teacher_id });
        res.status(201).json(newClass);
    } catch (error) {
        res.status(500).json({ message: 'Error creating class', error });
    }
});

// Edit kelas
router.put('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { name, grade_level, teacher_id } = req.body;
        await Class.update({ name, grade_level, teacher_id }, { where: { id: req.params.id } });
        res.json({ message: 'Class updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating class', error });
    }
});

// Hapus kelas
router.delete('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        await Class.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class', error });
    }
});

// Get daftar siswa dalam kelas tertentu
router.get('/:class_id/students',  accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const students = await Student.findAll({ 
            where: { class_id: req.params.class_id },
            include: [
                {
                    model: User,
                    as: 'parent',
                    attributes: ['id', 'name'],
                }
            ]
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error });
    }
});

// Tambah siswa ke dalam kelas
router.post('/:class_id/students', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { name, nisn, birth_date, parent_id } = req.body;
        const newStudent = await Student.create({
            name,
            nisn,
            birth_date,
            parent_id,
            class_id: req.params.class_id
        });
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(500).json({ message: 'Error adding student', error });
    }
});

// Edit data siswa dalam kelas
router.put('/:class_id/students/:student_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { name, nisn, birth_date, parent_id } = req.body;
        await Student.update(
            { name, nisn, birth_date, parent_id, class_id: req.params.class_id },
            { where: { id: req.params.student_id } }
        );
        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating student', error });
    }
});

// Hapus siswa dari kelas
router.delete('/:class_id/students/:student_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        await Student.destroy({ where: { id: req.params.student_id } });
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student', error });
    }
});


// Get daftar jadwal pelajaran dari kelas tertentu (filter perhari)
router.get('/:class_id/schedule', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { day } = req.query;
    const whereClause = { class_id: req.params.class_id };
    if (day) whereClause.day = day;

    try {
        const schedule = await Schedule.findAll({
            where: whereClause,
            include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
            order: [
                ['day', 'ASC'],         // Urutkan berdasarkan hari (jika mengambil semua hari)
                ['start_time', 'ASC']   // Berdasarkan jam mulai
            ]
        });
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule', error });
    }
});


// Tambah jadwal pelajaran baru dalam kelas
router.post('/:class_id/schedule', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { subject_id, day, start_time, end_time } = req.body;
        const class_id = req.params.class_id;

        const conflict = await Schedule.findOne({
            where: {
                class_id,
                day,
                [Op.or]: [
                    {
                        start_time: {
                            [Op.between]: [start_time, end_time]
                        }
                    },
                    {
                        end_time: {
                            [Op.between]: [start_time, end_time]
                        }
                    },
                    {
                        start_time: {
                            [Op.lte]: start_time
                        },
                        end_time: {
                            [Op.gte]: end_time
                        }
                    }
                ]
            }
        });

        if (conflict) {
            return res.status(409).json({ message: 'Jadwal bentrok dengan pelajaran lain di kelas ini' });
        }

        const newSchedule = await Schedule.create({
            class_id,
            subject_id,
            day,
            start_time,
            end_time
        });

        res.status(201).json(newSchedule);
    } catch (error) {
        console.error('Error adding schedule:', error);
        res.status(500).json({ message: 'Error adding schedule', error: error.message });
    }
});

// Edit jadwal pelajaran dalam kelas
router.put('/schedules/:schedule_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const schedule_id = req.params.schedule_id;
        const currentSchedule = await Schedule.findByPk(schedule_id);

        if (!currentSchedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        // Ambil data baru dari body, fallback ke data lama jika tidak dikirim
        const subject_id = req.body.subject_id ?? currentSchedule.subject_id;
        const day = req.body.day ?? currentSchedule.day;
        const start_time = req.body.start_time ?? currentSchedule.start_time;
        const end_time = req.body.end_time ?? currentSchedule.end_time;

        // Cek apakah ada jadwal lain yang bentrok
        const conflict = await Schedule.findOne({
            where: {
                id: { [Op.ne]: schedule_id },
                class_id: currentSchedule.class_id,
                day,
                [Op.or]: [
                    {
                        start_time: {
                            [Op.between]: [start_time, end_time]
                        }
                    },
                    {
                        end_time: {
                            [Op.between]: [start_time, end_time]
                        }
                    },
                    {
                        start_time: {
                            [Op.lte]: start_time
                        },
                        end_time: {
                            [Op.gte]: end_time
                        }
                    }
                ]
            }
        });

        if (conflict) {
            return res.status(409).json({ message: 'Jadwal bentrok dengan pelajaran lain di kelas ini' });
        }

        // Update jadwal
        await Schedule.update(
            { subject_id, day, start_time, end_time },
            { where: { id: schedule_id } }
        );

        res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ message: 'Error updating schedule', error: error.message });
    }
});

// Hapus jadwal pelajaran dalam kelas
router.delete('/schedules/:schedule_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        await Schedule.destroy({ where: { id: req.params.schedule_id } });
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting schedule', error });
    }
});

module.exports = router;
