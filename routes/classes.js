const express = require('express');
const router = express.Router();
const { Class, AcademicYear, Semester, Schedule, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op } = require('sequelize');

router.get('/', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      // Cari semester aktif
      const activeSemester = await Semester.findOne({
        where: {
          is_active: true
        },
        include: [
          {
            model: AcademicYear,
            required: true, // Hanya ambil semester yang memiliki academic_year
            where: {
              is_active: true // Pastikan tahun ajaran yang aktif
            }
          }
        ]
      });

      if (!activeSemester) {
        return res.status(404).json({ message: 'Tidak ada semester aktif ditemukan' });
      }

      // Ambil kelas yang terkait dengan semester aktif
      const classes = await Class.findAll({
        where: {
          academic_year_id: activeSemester.academic_year_id // Filter berdasarkan tahun ajaran yang aktif
        },
        attributes: ['id', 'name', 'academic_year_id', 'teacher_id'], // Menampilkan hanya atribut yang diperlukan
      });
  
      res.json(classes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Gagal mengambil data kelas', error });
    }
});

// Get daftar jadwal pelajaran dari kelas tertentu (filter perhari)
router.get('/:class_id/schedule', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { day } = req.query;
    const whereClause = { class_id: req.params.class_id };
    if (day) whereClause.day = day;

    try {
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        // Jangan menggunakan Schedule.academic_year_id, karena itu tidak ada.
        // Gunakan Class.academic_year_id dalam relasi dan filter
        const schedule = await Schedule.findAll({
            where: whereClause,
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['name']
                },
                {
                    model: Class,
                    as: 'class',
                    attributes: ['academic_year_id'],
                    where: {
                        academic_year_id: activeYear.id  // Filter berdasarkan tahun ajaran aktif pada tabel Class
                    }
                }
            ],
            order: [
                ['day', 'ASC'],
                ['start_time', 'ASC']
            ]
        });

        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule', error });
    }
});

// Tambah jadwal pelajaran baru dalam kelas
router.post('/:class_id/schedule', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { subject_id, day, start_time, end_time } = req.body;
    const { class_id } = req.params;

    try {
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        const classData = await Class.findOne({ where: { id: class_id, academic_year_id: activeYear.id } });
        if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran aktif' });

        // Validasi bentrok jadwal
        const conflictingSchedule = await Schedule.findOne({
            where: {
                class_id: class_id,
                day: day,
                [Op.or]: [
                    {
                        start_time: { [Op.between]: [start_time, end_time] }
                    },
                    {
                        end_time: { [Op.between]: [start_time, end_time] }
                    },
                    {
                        [Op.and]: [
                            { start_time: { [Op.lte]: start_time } },
                            { end_time: { [Op.gte]: end_time } }
                        ]
                    }
                ]
            }
        });

        if (conflictingSchedule) {
            return res.status(400).json({ message: 'Terdapat jadwal lain yang bentrok pada hari dan jam tersebut' });
        }

        const schedule = await Schedule.create({
            class_id,
            subject_id,
            day,
            start_time,
            end_time
        });

        res.status(201).json({ message: 'Jadwal berhasil ditambahkan', schedule });
    } catch (error) {
        res.status(500).json({ message: 'Error menambahkan jadwal', error });
    }
});

// Edit jadwal pelajaran dalam kelas
router.put('/schedule/:schedule_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { schedule_id } = req.params;
    const { subject_id, day, start_time, end_time } = req.body;

    try {
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        const schedule = await Schedule.findOne({
            where: { id: schedule_id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: activeYear.id }
            }
        });

        if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan untuk tahun ajaran aktif' });

        // Validasi bentrok jadwal (kecuali dirinya sendiri)
        const conflictingSchedule = await Schedule.findOne({
            where: {
                id: { [Op.ne]: schedule_id },
                class_id: schedule.class_id,
                day: day,
                [Op.or]: [
                    {
                        start_time: { [Op.between]: [start_time, end_time] }
                    },
                    {
                        end_time: { [Op.between]: [start_time, end_time] }
                    },
                    {
                        [Op.and]: [
                            { start_time: { [Op.lte]: start_time } },
                            { end_time: { [Op.gte]: end_time } }
                        ]
                    }
                ]
            }
        });

        if (conflictingSchedule) {
            return res.status(400).json({ message: 'Terdapat jadwal lain yang bentrok pada hari dan jam tersebut' });
        }

        await schedule.update({
            subject_id,
            day,
            start_time,
            end_time
        });

        res.json({ message: 'Jadwal berhasil diperbarui', schedule });
    } catch (error) {
        res.status(500).json({ message: 'Error mengedit jadwal', error });
    }
});

// Hapus jadwal pelajaran dalam kelas
router.delete('/schedule/:schedule_id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const { schedule_id } = req.params;

    try {
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        // Cari jadwal dan pastikan kelasnya ada di tahun ajaran aktif
        const schedule = await Schedule.findOne({
            where: { id: schedule_id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: activeYear.id }
            }
        });

        if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan untuk tahun ajaran aktif' });

        await schedule.destroy();

        res.json({ message: 'Jadwal berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Error menghapus jadwal', error });
    }
});

module.exports = router;