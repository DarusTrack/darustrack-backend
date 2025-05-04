const {
    AcademicYear, Class, Schedule, Subject, GradeCategory, GradeDetail,
    StudentClass, StudentGrade
  } = require('../models');
  const { Op } = require('sequelize');
  
  exports.getSubjectsByTeacherClass = async (req, res) => {
    try {
      const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
      if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
  
      const teacherClass = await Class.findOne({
        where: {
          teacher_id: req.user.id,
          academic_year_id: activeYear.id
        }
      });
  
      if (!teacherClass) return res.status(403).json({ message: 'Tidak ada kelas' });
  
      const schedules = await Schedule.findAll({
        where: { class_id: teacherClass.id },
        include: { model: Subject, as: 'subject', attributes: ['id', 'name'] }
      });
  
      const subjectSet = new Set();
      const uniqueSubjects = [];
  
      for (const s of schedules) {
        if (!subjectSet.has(s.subject.id)) {
          subjectSet.add(s.subject.id);
          uniqueSubjects.push({
            subject_id: s.subject.id,
            subject_name: s.subject.name
          });
        }
      }
  
      res.json(uniqueSubjects);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  exports.getGradeCategories = async (req, res) => {
    try {
      const { subject_id, semester_id } = req.params;
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
      if (!teacherClass) return res.status(403).json({ message: 'Tidak ada kelas' });
  
      const categories = await GradeCategory.findAll({
        where: {
          class_id: teacherClass.id,
          subject_id,
          semester_id
        },
        attributes: ['id', 'name']
      });
  
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  exports.createGradeCategory = async (req, res) => {
    try {
      const { subject_id, semester_id } = req.params;
      const { name } = req.body;
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
      if (!teacherClass) return res.status(403).json({ message: 'Tidak ada kelas' });
  
      const exists = await GradeCategory.findOne({
        where: {
          subject_id,
          class_id: teacherClass.id,
          semester_id,
          name
        }
      });
  
      if (exists) return res.status(400).json({ message: 'Kategori sudah ada' });
  
      const category = await GradeCategory.create({
        subject_id,
        class_id: teacherClass.id,
        semester_id,
        name
      });
  
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  exports.updateGradeCategory = async (req, res) => {
    try {
      const { category_id } = req.params;
      const { name } = req.body;
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
      const category = await GradeCategory.findByPk(category_id);
      if (!category || category.class_id !== teacherClass.id)
        return res.status(403).json({ message: 'Tidak dapat mengakses kategori ini' });
  
      const duplicate = await GradeCategory.findOne({
        where: {
          name,
          subject_id: category.subject_id,
          class_id: teacherClass.id,
          id: { [Op.ne]: category_id }
        }
      });
  
      if (duplicate) return res.status(400).json({ message: 'Nama kategori sudah digunakan' });
  
      await category.update({ name });
      res.json({ message: 'Berhasil diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  exports.deleteGradeCategory = async (req, res) => {
    try {
      const { category_id } = req.params;
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
      const category = await GradeCategory.findByPk(category_id);
      if (!category || category.class_id !== teacherClass.id)
        return res.status(403).json({ message: 'Tidak dapat menghapus kategori ini' });
  
      await GradeDetail.destroy({ where: { grade_category_id: category_id } });
      await GradeCategory.destroy({ where: { id: category_id } });
  
      res.json({ message: 'Kategori dihapus' });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  // === GRADE DETAILS ===
  
  exports.getGradeDetails = async (req, res) => {
    try {
      const { category_id } = req.params;
  
      const category = await GradeCategory.findByPk(category_id);
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
      if (!category || category.class_id !== teacherClass.id) {
        return res.status(403).json({ message: 'Akses ditolak' });
      }
  
      const details = await GradeDetail.findAll({ where: { grade_category_id: category_id } });
      res.json(details);
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  exports.createGradeDetail = async (req, res) => {
    try {
      const { category_id } = req.params;
      const { name, date } = req.body;
  
      const category = await GradeCategory.findByPk(category_id);
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
      if (!category || category.class_id !== teacherClass.id)
        return res.status(403).json({ message: 'Akses ditolak' });
  
      const existing = await GradeDetail.findOne({ where: { grade_category_id: category_id, name } });
      if (existing) return res.status(400).json({ message: 'Detail sudah ada' });
  
      const newDetail = await GradeDetail.create({ grade_category_id: category_id, name, date });
  
      const studentClasses = await StudentClass.findAll({ where: { class_id: teacherClass.id } });
      const grades = studentClasses.map(sc => ({
        student_class_id: sc.id,
        grade_detail_id: newDetail.id,
        score: null
      }));
  
      await StudentGrade.bulkCreate(grades);
      res.status(201).json({ message: 'Detail berhasil dibuat', newDetail });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  exports.updateGradeDetail = async (req, res) => {
    try {
      const { detail_id } = req.params;
      const { name, date } = req.body;
  
      const detail = await GradeDetail.findByPk(detail_id, {
        include: {
          model: GradeCategory,
          as: 'grade_category'
        }
      });
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
      if (!detail || detail.grade_category.class_id !== teacherClass.id)
        return res.status(403).json({ message: 'Akses ditolak' });
  
      if (name && name !== detail.name) {
        const exists = await GradeDetail.findOne({
          where: {
            grade_category_id: detail.grade_category_id,
            name,
            id: { [Op.ne]: detail.id }
          }
        });
        if (exists) return res.status(400).json({ message: 'Nama sudah digunakan' });
      }
  
      await detail.update({ name, date });
      res.json({ message: 'Detail diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  exports.deleteGradeDetail = async (req, res) => {
    try {
      const { detail_id } = req.params;
      const detail = await GradeDetail.findByPk(detail_id, {
        include: { model: GradeCategory, as: 'grade_category' }
      });
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
      if (!detail || detail.grade_category.class_id !== teacherClass.id)
        return res.status(403).json({ message: 'Akses ditolak' });
  
      await StudentGrade.destroy({ where: { grade_detail_id: detail_id } });
      await GradeDetail.destroy({ where: { id: detail_id } });
  
      res.json({ message: 'Detail dihapus' });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  exports.getStudentScores = async (req, res) => {
    try {
      const { detail_id } = req.params;
  
      const detail = await GradeDetail.findByPk(detail_id, {
        include: {
          model: GradeCategory,
          as: 'grade_category',
          include: { model: Class, as: 'class' }
        }
      });
  
      if (!detail) return res.status(404).json({ message: 'Detail tidak ditemukan' });
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
      if (!teacherClass || detail.grade_category.class.id !== teacherClass.id)
        return res.status(403).json({ message: 'Akses ditolak' });
  
      const studentGrades = await StudentGrade.findAll({
        where: { grade_detail_id: detail_id },
        include: {
          model: StudentClass,
          as: 'student_class',
          include: {
            model: require('../../models').Student,
            as: 'student',
            attributes: ['id', 'name']
          }
        }
      });
  
      const result = studentGrades.map(sg => ({
        student_grade_id: sg.id,
        student_id: sg.student_class.student.id,
        student_name: sg.student_class.student.name,
        score: sg.score
      }));
  
      res.json(result);
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
  };
  
  exports.updateStudentScore = async (req, res) => {
    try {
      const { student_grade_id } = req.params;
      const { score } = req.body;
  
      if (score === undefined || isNaN(score)) return res.status(400).json({ message: 'Skor tidak valid' });
  
      const grade = await StudentGrade.findByPk(student_grade_id, {
        include: {
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
        }
      });
  
      const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
      if (!grade || grade.grade_detail.grade_category.class.id !== teacherClass.id)
        return res.status(403).json({ message: 'Akses ditolak' });
  
      await grade.update({ score });
      res.json({ message: 'Skor diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: e.message });
    }
};
  