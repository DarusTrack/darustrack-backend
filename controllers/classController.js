const { AcademicYear, Class, StudentClass } = require('../models');
const { Op } = require('sequelize');

exports.getClassesByAcademicYear = async (req, res) => {
    try {
        const { id } = req.params;
        const academicYear = await AcademicYear.findByPk(id, {
            include: [{
                model: Class,
                as: 'class',
                attributes: ['id', 'name']
            }]
        });

        if (!academicYear) {
            return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
        }

        const classList = academicYear.class.map(cls => {
            const gradeLevel = parseInt(cls.name.charAt(0));
            return {
                id: cls.id,
                name: cls.name,
                grade_level: isNaN(gradeLevel) ? null : gradeLevel
            };
        });

        classList.sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            id: academicYear.id,
            year: academicYear.year,
            is_active: academicYear.is_active,
            classes: classList
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

exports.createClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, teacher_id } = req.body;

        const academicYear = await AcademicYear.findByPk(id);
        if (!academicYear) {
            return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
        }

        const existingClass = await Class.findOne({
            where: { name, academic_year_id: id }
        });

        if (existingClass) {
            return res.status(400).json({ message: 'Kelas dengan nama yang sama sudah ada di tahun ajaran ini' });
        }

        const newClass = await Class.create({
            name,
            teacher_id,
            academic_year_id: id
        });

        res.status(201).json(newClass);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

exports.updateClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, teacher_id } = req.body;

        const existingClass = await Class.findByPk(classId);
        if (!existingClass) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }

        const updateFields = {};
        if (name) updateFields.name = name;
        if (teacher_id) updateFields.teacher_id = teacher_id;

        if (Object.keys(updateFields).length > 0) {
            await existingClass.update(updateFields);
        }

        res.json({ message: 'Kelas berhasil diperbarui', data: existingClass });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const existingClass = await Class.findByPk(classId);
        if (!existingClass) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }

        await existingClass.destroy();
        res.json({ message: 'Kelas berhasil dihapus' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

exports.getActiveYearClasses = async (req, res) => {
    try {
        const { grade_level } = req.query;

        const activeAcademicYear = await AcademicYear.findOne({
            where: { is_active: true }
        });

        if (!activeAcademicYear) {
            return res.status(404).json({ message: 'Tidak ada tahun ajaran aktif ditemukan' });
        }

        const whereConditions = {
            academic_year_id: activeAcademicYear.id
        };

        if (grade_level) {
            whereConditions.name = {
                [Op.like]: `${grade_level}%`
            };
        }

        const foundClasses = await Class.findAll({
            where: whereConditions,
            attributes: ['id', 'name', 'academic_year_id', 'teacher_id'],
            order: [['name', 'ASC']]
        });

        const classesWithGradeLevel = foundClasses.map(cls => {
            const gradeLevel = parseInt(cls.name.charAt(0));
            return {
                ...cls.toJSON(),
                grade_level: isNaN(gradeLevel) ? null : gradeLevel
            };
        });

        res.json(classesWithGradeLevel);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil data kelas', error: error.message });
    }
};