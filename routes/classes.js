const express = require('express');
const router = express.Router();
const { Class, Student, User, Schedule, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

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
    const { day } = req.query; // Filter berdasarkan hari
    const whereClause = { class_id: req.params.class_id };
    if (day) whereClause.day = day;

    try {
        const schedule = await Schedule.findAll({
            where: whereClause,
            include: [{ model: Subject, as: 'subject', attributes: ['name'] }]
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
        const newSchedule = await Schedule.create({
            class_id: req.params.class_id,
            subject_id,
            day,
            start_time,
            end_time
        });
        res.status(201).json(newSchedule);
    } catch (error) {
        res.status(500).json({ message: 'Error adding schedule', error });
    }
});

// Edit jadwal pelajaran dalam kelas
router.put('/:class_id/schedule/:schedule_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        const { subject_id, day, start_time, end_time } = req.body;
        await Schedule.update(
            { subject_id, day, start_time, end_time },
            { where: { id: req.params.schedule_id } }
        );
        res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating schedule', error });
    }
});

// Hapus jadwal pelajaran dalam kelas
router.delete('/:class_id/schedule/:schedule_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    try {
        await Schedule.destroy({ where: { id: req.params.schedule_id } });
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting schedule', error });
    }
});

module.exports = router;
