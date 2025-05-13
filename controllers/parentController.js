const { Op } = require('sequelize');
const { User, AcademicYear, Semester, Student, StudentClass, Attendance, Schedule, Subject, Class, Evaluation, AcademicCalendar, Curriculum, StudentEvaluation, GradeCategory, GradeDetail, StudentGrade } = require('../models');

// Helper untuk handling error
const handleError = (res, error, defaultMessage) => {
  console.error(error);
  res.status(500).json({ message: defaultMessage, error: error.message });
};

// Profile Anak
exports.getStudentProfile = async (req, res) => {
    try {
        const parentId = req.user.id;

        const student = await Student.findOne({
            where: { parent_id: parentId },
            attributes: ['name', 'nisn', 'birth_date'],
            include: [{
                model: StudentClass,
                as: 'student_class',
                attributes: ['id'],
                include: [{
                    model: Class,
                    as: 'class',
                    attributes: ['name'],
                    include: [
                        {
                            model: AcademicYear,
                            as: 'academic_year',
                            where: { is_active: true },
                            required: true,         // Hanya untuk filter, tidak ditampilkan
                            attributes: []          // Jangan tampilkan di response
                        },
                        {
                            model: User,
                            as: 'teacher',
                            attributes: ['name']
                        }
                    ]
                }]
            }]
        });

        if (!student || !student.student_class?.length) {
            return res.status(404).json({ message: 'Data anak tidak ditemukan atau tidak ada kelas di tahun ajaran aktif' });
        }

        // Ambil hanya student_class yang berisi class dari academic_year aktif
        const activeStudentClass = student.student_class.filter(sc => sc.class?.name);

        if (!activeStudentClass.length) {
            return res.status(404).json({ message: 'Kelas anak tidak berada di tahun ajaran aktif' });
        }

        const result = {
            name: student.name,
            nisn: student.nisn,
            birth_date: student.birth_date,
            student_class: activeStudentClass
        };

        res.json(result);
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Jadwal Mata Pelajaran Anak berdasarkan Hari
exports.getStudentSchedule = async (req, res) => {
    try {
        const parentId = req.user.id;
        console.log(`Parent ID: ${parentId}`);

        const student = await Student.findOne({
            where: { parent_id: parentId },
            include: [{
                model: StudentClass,
                as: 'student_class',
                include: [{
                    model: Class,
                    as: 'class',
                    include: [{
                        model: AcademicYear,
                        as: 'academic_year',
                        where: { is_active: true }, // Hanya tahun ajaran aktif
                        attributes: ['id']
                    }],
                    attributes: ['id', 'academic_year_id']
                }],
                attributes: ['class_id']
            }]
        });

        if (!student || !student.student_class?.length) {
            return res.status(404).json({ message: 'Data anak tidak ditemukan atau tidak memiliki kelas di tahun ajaran aktif' });
        }

        // Cari student_class yang memiliki class & academic_year aktif
        const activeStudentClass = student.student_class.find(sc => sc.class && sc.class.academic_year);

        if (!activeStudentClass) {
            return res.status(404).json({ message: 'Kelas anak tidak berada di tahun ajaran aktif' });
        }

        const classId = activeStudentClass.class.id;

        // Ambil parameter "day" dari query
        const { day } = req.query;
        const whereCondition = { class_id: classId };

        if (day) {
            whereCondition.day = { [Op.eq]: day };
        }

        // Ambil jadwal
        const schedules = await Schedule.findAll({
            where: whereCondition,
            attributes: ['day', 'start_time', 'end_time'],
            include: [{
                model: Subject,
                as: 'subject',
                attributes: ['name']
            }],
            order: [
                ['day', 'ASC'],
                ['start_time', 'ASC']
            ]
        });

        res.json(schedules);
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};