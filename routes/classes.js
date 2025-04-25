const express = require('express');
const router = express.Router();
const { Class, Student, StudentClass, Schedule, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op } = require('sequelize');

// GET all classes with students in each class
router.get('/', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      const classes = await Class.findAll({
        include: [
          {
            model: StudentClass,
            as: 'student_class',
            include: [
              {
                model: Student,
                attributes: ['id', 'name', 'nisn', 'birth_date', 'parent_id', 'createdAt', 'updatedAt']
              }
            ]
          }
        ]
      });
      res.json(classes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Gagal mengambil data kelas', error });
    }
});  

// Tambah kelas
router.post('/', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      const { name, grade_level, teacher_id } = req.body;
      const newClass = await Class.create({ name, grade_level, teacher_id });
      res.status(201).json(newClass);
    } catch (error) {
      res.status(500).json({ message: 'Gagal menambahkan kelas', error });
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

// tambah siswa ke dalam kelas
router.post('/:classId/add-student', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      const { student_id, semester_id } = req.body;
      const { classId } = req.params;
  
      const existing = await StudentClass.findOne({
        where: { student_id, class_id: classId, semester_id }
      });
  
      if (existing) {
        return res.status(400).json({ message: 'Siswa sudah terdaftar di kelas ini untuk semester tersebut.' });
      }
  
      const studentClass = await StudentClass.create({
        student_id,
        class_id: classId,
        semester_id
      });
  
      res.status(201).json({ message: 'Siswa berhasil ditambahkan ke kelas', studentClass });
    } catch (error) {
        console.error('Error detail:', error);
        res.status(500).json({ message: 'Gagal menambahkan siswa ke kelas', error: error.message });
    }      
});

// Hapus siswa dari kelas
router.delete('/:classId/remove-student/:studentId', accessValidation, roleValidation(['admin']), async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    await StudentClass.destroy({
      where: { class_id: classId, student_id: studentId }
    });
    res.json({ message: 'Siswa berhasil dikeluarkan dari kelas' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus siswa dari kelas', error });
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
