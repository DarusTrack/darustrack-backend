const { AcademicYear, Class, Semester, Evaluation, StudentClass, StudentEvaluation, Student } = require('../../models');
const { Op } = require('sequelize');

exports.getEvaluationsBySemester = async (req, res) => {
  try {
    const semesterId = req.params.semester_id;
    const userId = req.user.id;

    const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: activeYear.id } });

    if (!myClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    const evaluations = await Evaluation.findAll({
      where: {
        class_id: myClass.id,
        semester_id: semesterId
      }
    });

    res.json({ evaluations });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil evaluasi', error });
  }
};

exports.createEvaluation = async (req, res) => {
  try {
    const { semester_id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Judul evaluasi harus diisi' });
    }

    const semester = await Semester.findOne({
      where: { id: semester_id },
      include: {
        model: AcademicYear,
        as: 'academic_year',
        where: { is_active: true }
      }
    });

    if (!semester) return res.status(404).json({ message: 'Semester tidak ditemukan atau tidak aktif' });

    const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: semester.academic_year_id } });
    if (!myClass) return res.status(404).json({ message: 'Anda bukan wali kelas pada tahun ajaran ini' });

    const existing = await Evaluation.findOne({
      where: {
        title: title.trim(),
        class_id: myClass.id,
        semester_id: semester.id
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Evaluasi dengan judul ini sudah ada' });
    }

    const evaluation = await Evaluation.create({
      title: title.trim(),
      class_id: myClass.id,
      semester_id: semester.id
    });

    const studentClasses = await StudentClass.findAll({ where: { class_id: myClass.id } });

    const inserts = studentClasses.map(sc => ({
      evaluation_id: evaluation.id,
      student_class_id: sc.id,
      description: null
    }));

    await StudentEvaluation.bulkCreate(inserts);

    res.status(201).json({ message: 'Evaluasi berhasil ditambahkan', evaluation });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan evaluasi', error: error.message });
  }
};

exports.updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Judul evaluasi harus diisi' });
    }

    const evaluation = await Evaluation.findByPk(id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });

    const semester = await Semester.findByPk(evaluation.semester_id);
    const academicYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: academicYear.id } });

    if (!myClass || evaluation.class_id !== myClass.id) {
      return res.status(403).json({ message: 'Anda tidak berhak mengedit evaluasi ini' });
    }

    const duplicate = await Evaluation.findOne({
      where: {
        title: title.trim(),
        class_id: myClass.id,
        semester_id: evaluation.semester_id,
        id: { [Op.ne]: evaluation.id }
      }
    });

    if (duplicate) {
      return res.status(400).json({ message: 'Judul evaluasi ini sudah digunakan' });
    }

    await evaluation.update({ title: title.trim() });
    res.json({ message: 'Evaluasi berhasil diperbarui', evaluation });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengedit evaluasi', error: error.message });
  }
};

exports.deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluation.destroy({ where: { id } });
    res.json({ message: 'Evaluasi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus evaluasi', error });
  }
};

exports.getStudentEvaluations = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const evaluation = await Evaluation.findByPk(id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });

    const semester = await Semester.findByPk(evaluation.semester_id);
    const academicYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: academicYear.id } });

    if (!myClass || evaluation.class_id !== myClass.id) {
      return res.status(403).json({ message: 'Anda tidak berhak melihat evaluasi ini' });
    }

    const studentEvaluations = await StudentEvaluation.findAll({
      where: { evaluation_id: id },
      include: {
        model: StudentClass,
        as: 'student_class',
        include: {
          model: Student,
          as: 'student',
          attributes: ['name', 'nisn']
        }
      }
    });

    const result = studentEvaluations.map(se => ({
      student_evaluation_id: se.id,
      name: se.student_class?.student?.name,
      nisn: se.student_class?.student?.nisn,
      description: se.description
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil evaluasi siswa', error: error.message });
  }
};

exports.updateStudentEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const userId = req.user.id;

    const studentEvaluation = await StudentEvaluation.findByPk(id, {
      include: {
        model: Evaluation,
        as: 'evaluation'
      }
    });

    if (!studentEvaluation) {
      return res.status(404).json({ message: "Evaluasi siswa tidak ditemukan" });
    }

    const evaluation = studentEvaluation.evaluation;

    const semester = await Semester.findByPk(evaluation.semester_id);
    const academicYear = await AcademicYear.findOne({ where: { id: semester.academic_year_id, is_active: true } });
    const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: academicYear.id } });

    if (!myClass || evaluation.class_id !== myClass.id) {
      return res.status(403).json({ message: 'Anda tidak berhak mengubah evaluasi ini' });
    }

    studentEvaluation.description = description;
    await studentEvaluation.save();

    res.json({ message: "Deskripsi evaluasi berhasil diperbarui" });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui deskripsi evaluasi', error: error.message });
  }
};
