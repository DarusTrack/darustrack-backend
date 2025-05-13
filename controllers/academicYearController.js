const { AcademicYear, Semester, Class, StudentClass, Student } = require('../models');
const { Op } = require('sequelize');

exports.getAllAcademicYears = async (req, res) => {
    try {
        const academicYears = await AcademicYear.findAll({
            include: [{
                model: Semester,
                as: 'semester',
                attributes: ['id', 'name', 'is_active']
            }],
            order: [['year', 'DESC']]
        });
        res.json(academicYears);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createAcademicYear = async (req, res) => {
    try {
        const { year, is_active = false } = req.body;

        const existingAcademicYear = await AcademicYear.findOne({ where: { year } });
        if (existingAcademicYear) {
            return res.status(400).json({ message: 'Tahun ajaran sudah ada.' });
        }

        // Jika tahun ajaran baru akan diaktifkan, nonaktifkan semua tahun ajaran aktif dan semester-nya
        if (is_active) {
            const activeAcademicYears = await AcademicYear.findAll({ where: { is_active: true } });
            for (const ay of activeAcademicYears) {
                await ay.update({ is_active: false });
                await Semester.update(
                { is_active: false },
                { where: { academic_year_id: ay.id } }
                );
            }
        }

        // Buat tahun ajaran baru
        const newAcademicYear = await AcademicYear.create({ year, is_active });

        // Jika tahun ajaran baru tidak aktif, nonaktifkan semester-nya (setelah hook afterCreate berjalan)
        if (!is_active) {
        await Semester.update(
            { is_active: false },
            { where: { academic_year_id: newAcademicYear.id } }
        );
        }

        res.status(201).json({
        message: `Tahun ajaran berhasil ditambahkan${is_active ? ' dan diaktifkan' : ''}.`,
        data: newAcademicYear
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan tahun ajaran', error: error.message });
    }
};

exports.updateAcademicYear = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, is_active } = req.body;
        const academicYear = await AcademicYear.findByPk(id);

        if (!academicYear) {
            return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
        }

        if (is_active) {
            await AcademicYear.update({ is_active: false }, { where: {} });
        }

        if (year && academicYear.year !== year) {
            const existing = await AcademicYear.findOne({ where: { year } });
            if (existing && existing.id !== id) {
                return res.status(400).json({ message: `Tahun ajaran '${year}' sudah ada.` });
            }
            academicYear.year = year;
        }

        if (typeof is_active !== 'undefined') {
            academicYear.is_active = is_active;
        }

        await academicYear.save();
        res.json({ message: 'Tahun ajaran berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
};

exports.deleteAcademicYear = async (req, res) => {
    try {
        await AcademicYear.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Deleted Successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSemesterStatus = async (req, res) => {
    try {
        const { is_active } = req.body;
        const semesterToUpdate = await Semester.findByPk(req.params.id);

        if (!semesterToUpdate) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        const academicYear = await AcademicYear.findByPk(semesterToUpdate.academic_year_id);
        if (!academicYear?.is_active) {
            return res.status(400).json({ message: 'Semester ini tidak berasal dari tahun ajaran aktif' });
        }

        if (is_active) {
            await Semester.update({ is_active: false }, {
                where: { academic_year_id: academicYear.id }
            });
        }

        semesterToUpdate.is_active = is_active;
        await semesterToUpdate.save();
        
        res.json({ message: `Semester berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};