const { AcademicYear, Class, StudentClass } = require('../models');

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