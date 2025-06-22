const { Op } = require('sequelize');
const { Schedule, Subject, Class, AcademicYear, GradeCategory, GradeDetail, StudentGrade, StudentClass, Student } = require('../models');

const getSubjects = async (req, res) => {
  try {
    const activeAcademicYear = await AcademicYear.findOne({
      where: { is_active: true },
      attributes: ['id']
    });

    if (!activeAcademicYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });

    const teacherClass = await Class.findOne({
      where: { teacher_id: req.user.id, academic_year_id: activeAcademicYear.id },
      attributes: ['id']
    });

    if (!teacherClass) return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar di tahun ajaran aktif' });

    const subjects = await Schedule.findAll({
      where: { class_id: teacherClass.id },
      include: {
        model: Subject,
        as: 'subject',
        attributes: ['id', 'name']
      },
      attributes: ['subject_id'],
      raw: true,
      nest: true
    });

    const seen = new Set();
    const uniqueSubjects = subjects
      .filter(s => !seen.has(s.subject.id) && seen.add(s.subject.id))
      .map(s => ({
        subject_id: s.subject.id,
        subject_name: s.subject.name
      }))
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name));

    res.json(uniqueSubjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const teacherClass = await Class.findOne({
      where: { teacher_id: req.user.id },
      attributes: ['id']
    });
    if (!teacherClass) return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });

    const categories = await GradeCategory.findAll({
      where: {
        class_id: teacherClass.id,
        subject_id: req.params.subject_id,
        semester_id: req.params.semester_id
      },
      attributes: ['id', 'name']
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { subject_id, semester_id } = req.params;
    const { name } = req.body;

    const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id }, attributes: ['id'] });
    if (!teacherClass) return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });

    const exists = await GradeCategory.findOne({
      where: { subject_id, class_id: teacherClass.id, semester_id, name }
    });
    if (exists) return res.status(400).json({ message: 'Kategori sudah ada' });

    const newCategory = await GradeCategory.create({ subject_id, class_id: teacherClass.id, semester_id, name });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { name } = req.body;

    const category = await GradeCategory.findByPk(category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id }, attributes: ['id'] });
    if (!teacherClass || teacherClass.id !== category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    const duplicate = await GradeCategory.findOne({
      where: { name, class_id: teacherClass.id, subject_id: category.subject_id, id: { [Op.ne]: category_id } }
    });
    if (duplicate) return res.status(400).json({ message: 'Nama kategori sudah digunakan' });

    await category.update({ name });
    res.json({ message: 'Kategori berhasil diperbarui' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await GradeCategory.findByPk(req.params.category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id }, attributes: ['id'] });
    if (!teacherClass || teacherClass.id !== category.class_id) return res.status(403).json({ message: 'Akses ditolak' });

    await GradeDetail.destroy({ where: { grade_category_id: category.id } });
    await category.destroy();
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getGradeDetails = async (req, res) => {
    try {
        const { category_id } = req.params;

        const category = await GradeCategory.findOne({ where: { id: category_id } });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || category.class_id !== teacherClass.id)
            return res.status(403).json({ message: 'Access denied to this category' });

        const details = await GradeDetail.findAll({
            where: { grade_category_id: category_id },
            order: [['name', 'ASC']]
        });

        res.json(details);
    } catch (e) {
        res.status(500).json({ message: 'Server error', error: e.message });
    }
};

const createGradeDetail = async (req, res) => {
  try {
    const { name, date } = req.body;
    const { category_id } = req.params;

    const category = await GradeCategory.findByPk(category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id }, attributes: ['id'] });
    if (!teacherClass || category.class_id !== teacherClass.id) return res.status(403).json({ message: 'Akses ditolak' });

    const existing = await GradeDetail.findOne({ where: { grade_category_id: category_id, name } });
    if (existing) return res.status(400).json({ message: 'Detail sudah ada' });

    const newDetail = await GradeDetail.create({ grade_category_id: category_id, name, date });

    const studentClasses = await StudentClass.findAll({ where: { class_id: teacherClass.id }, attributes: ['id'] });
    const grades = studentClasses.map(sc => ({
      student_class_id: sc.id,
      grade_detail_id: newDetail.id,
      score: null
    }));
    await StudentGrade.bulkCreate(grades);

    res.status(201).json({ message: 'Detail ditambahkan', newDetail });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
};

const updateGradeDetail = async (req, res) => {
    try {
        const { detail_id } = req.params;
        const { name, date } = req.body;

        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: {
                model: GradeCategory,
                as: 'grade_category'
            }
        });

        if (!gradeDetail) {
            return res.status(404).json({ message: 'Detail not found' });
        }

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class_id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (name && name !== gradeDetail.name) {
            const duplicate = await GradeDetail.findOne({
                where: {
                    grade_category_id: gradeDetail.grade_category_id,
                    name,
                    id: { [Op.ne]: detail_id }
                }
            });
            if (duplicate) {
                return res.status(400).json({ message: 'Duplicate detail name' });
            }
        }

        await gradeDetail.update({
            name: name || gradeDetail.name,
            date: date || gradeDetail.date
        });

        res.json({ message: 'Detail category updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error', error: e.message });
    }
};

const deleteGradeDetail = async (req, res) => {
    try {
        const { detail_id } = req.params;

        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: { model: GradeCategory, as: 'grade_category' }
        });

        if (!gradeDetail) return res.status(404).json({ message: 'Detail not found' });

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class_id !== teacherClass.id)
            return res.status(403).json({ message: 'Access denied' });

        await StudentGrade.destroy({ where: { grade_detail_id: detail_id } });
        await GradeDetail.destroy({ where: { id: detail_id } });

        res.json({ message: 'Detail category deleted' });
    } catch (e) {
        res.status(500).json({ message: 'Server error', error: e.message });
    }
};

const getStudentGrades = async (req, res) => {
    try {
        const { detail_id } = req.params;

        const gradeDetail = await GradeDetail.findOne({
            where: { id: detail_id },
            include: {
                model: GradeCategory,
                as: 'grade_category',
                include: {
                    model: Class,
                    as: 'class'
                }
            }
        });

        if (!gradeDetail) return res.status(404).json({ message: 'Detail not found' });

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class.id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const studentGrades = await StudentGrade.findAll({
            where: { grade_detail_id: detail_id },
            include: [
                {
                    model: StudentClass,
                    as: 'student_class',
                    include: {
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'name']
                    }
                }
            ],
            order: [[{ model: StudentClass, as: 'student_class' }, { model: Student, as: 'student' }, 'name', 'ASC']]
        });

        const result = studentGrades.map(entry => ({
            student_grade_id: entry.id,
            student_id: entry.student_class?.student?.id,
            student_name: entry.student_class?.student?.name,
            score: entry.score
        }));

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error', error: e.message });
    }
};

const updateStudentGrade = async (req, res) => {
    try {
        const { student_grade_id } = req.params;
        const { score } = req.body;

        if (score === undefined || score === null || isNaN(score)) {
            return res.status(400).json({ message: 'Invalid score' });
        }

        const studentGrade = await StudentGrade.findOne({
            where: { id: student_grade_id },
            include: [
                {
                    model: GradeDetail,
                    as: 'grade_detail',
                    include: {
                        model: GradeCategory,
                        as: 'grade_category',
                        include: {
                            model: Class,
                            as: 'class'
                        }
                    }
                },
                {
                    model: StudentClass,
                    as: 'student_class',
                    include: {
                        model: Student,
                        as: 'student'
                    }
                }
            ]
        });

        if (!studentGrade) {
            return res.status(404).json({ message: 'Student grade not found' });
        }

        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || studentGrade.grade_detail.grade_category.class.id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!studentGrade.student_class_id) {
            const gradeClassId = studentGrade.grade_detail.grade_category.class.id;
            let studentId = studentGrade.student_class?.student?.id;

            if (!studentId && studentGrade.student_class_id) {
                const sc = await StudentClass.findByPk(studentGrade.student_class_id);
                studentId = sc?.student_id;
            }

            if (!studentId) {
                return res.status(400).json({ message: 'Tidak bisa menetapkan student_class_id karena student tidak ditemukan' });
            }

            const studentClass = await StudentClass.findOne({
                where: {
                    class_id: gradeClassId,
                    student_id: studentId
                }
            });

            if (!studentClass) {
                return res.status(400).json({ message: 'StudentClass tidak ditemukan untuk siswa tersebut di kelas ini' });
            }

            studentGrade.student_class_id = studentClass.id;
        }

        studentGrade.score = score;
        await studentGrade.save();

        return res.json({ message: 'Score updated successfully' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error', error: e.message });
    }
};

module.exports = {
    getSubjects,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getGradeDetails,
    createGradeDetail,
    updateGradeDetail,
    deleteGradeDetail,
    getStudentGrades,
    updateStudentGrade
};