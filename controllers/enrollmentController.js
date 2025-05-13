const { AcademicYear, Class, StudentClass, Student } = require('../models');
const { Op } = require('sequelize');

exports.getClassStudents = async (req, res) => {
    try {
        const classData = await Class.findOne({
            where: {
                id: req.params.classId,
                academic_year_id: req.params.academicYearId
            },
            include: [{
                model: StudentClass,
                as: 'student_class',
                include: [{
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'name', 'nisn', 'birth_date', 'parent_id']
                }]
            }]
        });

        if (!classData) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan di tahun ajaran ini' });
        }

        const students = (classData.student_class || [])
            .map(sc => sc.student)
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            class_id: classData.id,
            class_name: classData.name,
            students: students
        });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
};

exports.addStudentsToClass = async (req, res) => {
    try {
        const { studentIds } = req.body;
        const classData = await Class.findOne({
            where: { 
                id: req.params.classId,
                academic_year_id: req.params.academicYearId 
            }
        });

        if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

        const existingAssignments = await StudentClass.findAll({
            where: {
                student_id: studentIds,
                class_id: (await Class.findAll({
                    where: { academic_year_id: req.params.academicYearId },
                    attributes: ['id']
                })).map(c => c.id)
            }
        });

        if (existingAssignments.length > 0) {
            return res.status(400).json({
                message: 'Siswa sudah terdaftar di kelas lain dalam tahun ajaran ini',
                student_ids: existingAssignments.map(entry => entry.student_id)
            });
        }

        await StudentClass.bulkCreate(
            studentIds.map(studentId => ({
                student_id: studentId,
                class_id: req.params.classId
            }))
        );

        res.status(201).json({ message: 'Siswa berhasil ditambahkan ke kelas.' });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
};

exports.removeStudentFromClass = async (req, res) => {
    try {
        const studentClass = await StudentClass.findOne({
            where: {
                student_id: req.params.studentId,
                class_id: req.params.classId
            }
        });

        if (!studentClass) {
            return res.status(404).json({ message: 'Siswa tidak terdaftar dalam kelas ini' });
        }

        await studentClass.destroy();
        res.status(200).json({ message: 'Siswa berhasil dihapus dari kelas' });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus siswa', error });
    }
};