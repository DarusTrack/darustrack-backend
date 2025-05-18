const express = require('express');
const router = express.Router();
const { Class, AcademicYear, Semester, Schedule, Subject } = require('../models');
const { Sequelize, Op } = require('sequelize'); 
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// class tahun ajaran aktif
router.get('/', accessValidation, roleValidation(['admin']), async (req, res) => {
  try {
    const { academic_year_id, limit = 50, offset = 0 } = req.query;

    const whereConditions = {};
    if (academic_year_id) whereConditions.academic_year_id = academic_year_id;

    const { count, rows: foundClasses } = await Class.findAndCountAll({
      where: whereConditions,
      attributes: ['id', 'name', 'academic_year_id', 'teacher_id'],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const classesWithGradeLevel = foundClasses.map(cls => {
      const gradeLevel = parseInt(cls.name.charAt(0));
      return {
        ...cls.toJSON(),
        grade_level: isNaN(gradeLevel) ? null : gradeLevel
      };
    });

    res.status(200).json({classesWithGradeLevel});
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'fail',
      message: 'Terjadi kesalahan saat mengambil daftar kelas',
    });
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

        // Temukan jadwal yang class-nya tidak sesuai dengan tahun ajaran aktif
        const schedulesToDelete = await Schedule.findAll({
            where: {
                class_id: req.params.class_id,
            },
            include: [
                {
                    model: Class,
                    as: 'class',
                    where: {
                        academic_year_id: { [Op.ne]: activeYear.id }
                    }
                }
            ]
        });

        // Hapus data yang ditemukan
        const idsToDelete = schedulesToDelete.map(s => s.id);
        if (idsToDelete.length > 0) {
            await Schedule.destroy({
                where: {
                    id: idsToDelete
                }
            });
        }

        // Ambil jadwal yang sesuai dengan tahun ajaran aktif
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
                    attributes: ['id', 'name', 'academic_year_id'],
                    where: {
                        academic_year_id: activeYear.id
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
        console.error(error);
        res.status(500).json({ message: 'Error fetching schedule', error });
    }
});

// Tambah jadwal pelajaran baru dalam kelas
router.post('/:class_id/schedule', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const convertDayToIndonesian = (dayEnglish) => {
        const dayMap = {
            Monday: "Senin",
            Tuesday: "Selasa",
            Wednesday: "Rabu",
            Thursday: "Kamis",
            Friday: "Jumat",
            Saturday: "Sabtu",
            Sunday: "Minggu"
        };
        return dayMap[dayEnglish] || dayEnglish;
    };

    let { subject_id, day, start_time, end_time } = req.body;
    const { class_id } = req.params;

    day = convertDayToIndonesian(day);

    try {
        // Cari tahun ajaran aktif
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
                    { start_time: { [Op.between]: [start_time, end_time] } },
                    { end_time: { [Op.between]: [start_time, end_time] } },
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

    // Pastikan start_time dan end_time terisi jika mereka ingin diperbarui
    if ((start_time || end_time) && (!start_time || !end_time)) {
        return res.status(400).json({ message: 'Jika waktu mulai atau waktu selesai diubah, keduanya harus diisi' });
    }

    try {
        // Mencari tahun ajaran aktif
        const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
        if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

        // Mencari jadwal yang ingin diperbarui
        const schedule = await Schedule.findOne({
            where: { id: schedule_id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: activeYear.id }
            }
        });

        if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan untuk tahun ajaran aktif' });

        // Validasi bentrok hanya jika start_time atau end_time diubah
        if (start_time || end_time) {
            const conflictingSchedule = await Schedule.findOne({
                where: {
                    id: { [Op.ne]: schedule_id }, // Tidak mempertimbangkan jadwal itu sendiri
                    class_id: schedule.class_id, // Kelas yang sama
                    day: day || schedule.day, // Hari yang sama atau yang baru
                    [Op.or]: [
                        {
                            start_time: { [Op.between]: [start_time, end_time] } // Cek apakah waktu mulai bentrok
                        },
                        {
                            end_time: { [Op.between]: [start_time, end_time] } // Cek apakah waktu selesai bentrok
                        },
                        {
                            [Op.and]: [
                                { start_time: { [Op.lte]: start_time } }, // Cek apakah jadwal yang ada lebih awal
                                { end_time: { [Op.gte]: end_time } } // Cek apakah jadwal yang ada lebih akhir
                            ]
                        }
                    ]
                }
            });

            // Jika ditemukan jadwal yang bentrok
            if (conflictingSchedule) {
                return res.status(400).json({ message: 'Terdapat jadwal lain yang bentrok pada hari dan jam tersebut di kelas yang sama' });
            }
        }

        // Pastikan jadwal yang baru tidak sama persis dengan jadwal lainnya
        const exactSameSchedule = await Schedule.findOne({
            where: {
                id: { [Op.ne]: schedule_id }, // Tidak mempertimbangkan dirinya sendiri
                class_id: schedule.class_id,
                day: day || schedule.day, // Hari yang sama atau yang baru
                start_time: start_time || schedule.start_time, // Gunakan waktu lama jika tidak diubah
                end_time: end_time || schedule.end_time // Gunakan waktu lama jika tidak diubah
            }
        });

        // Jika jadwal yang persis sama ditemukan, batalkan pembaruan
        if (exactSameSchedule) {
            return res.status(400).json({ message: 'Jadwal yang sama persis sudah ada pada kelas dan hari yang sama' });
        }

        // Update jadwal jika tidak ada bentrok dan tidak ada jadwal yang sama persis
        await schedule.update({
            subject_id: subject_id || schedule.subject_id, // Gunakan subject lama jika tidak diubah
            day: day || schedule.day, // Gunakan hari lama jika tidak diubah
            start_time: start_time || schedule.start_time, // Gunakan waktu lama jika tidak diubah
            end_time: end_time || schedule.end_time // Gunakan waktu lama jika tidak diubah
        });

        res.json({ message: 'Jadwal berhasil diperbarui' });
    } catch (error) {
        console.error(error);
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