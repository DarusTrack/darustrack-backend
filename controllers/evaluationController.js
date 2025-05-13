const { Evaluation, StudentEvaluation, AcademicYear, Semester, Class, StudentClass, Student } = require('../models');

// title evaluasi semester
exports.getEvaluations = async (req, res) => {
    try {
      const userId = req.user.id;
      const semesterId = req.params.semester_id;
  
      const activeYear = await AcademicYear.findOne({ where: { is_active: true } });
      const myClass = await Class.findOne({ where: { teacher_id: userId, academic_year_id: activeYear.id } });
  
      if (!myClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });
  
      const evaluations = await Evaluation.findAll({
        where: {
          class_id: myClass.id,
          semester_id: semesterId
        },
        order: [['title', 'ASC']] // Urut berdasarkan abjad judul evaluasi
      });
  
      res.json({ evaluations });
    } catch (error) {
      res.status(500).json({ message: 'Gagal mengambil evaluasi', error: error.message });
    }
};  

// Tambah title evaluasi per semester
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

        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: semester.academic_year_id }
        });
        if (!myClass) return res.status(404).json({ message: 'Anda tidak menjadi wali kelas pada tahun ajaran ini' });

        const existingEvaluation = await Evaluation.findOne({
            where: {
                title: title.trim(),
                class_id: myClass.id,
                semester_id: semester.id
            }
        });

        if (existingEvaluation) {
            return res.status(400).json({ message: 'Evaluasi dengan judul ini sudah ada di semester ini untuk kelas Anda' });
        }

        const evaluation = await Evaluation.create({
            title: title.trim(),
            class_id: myClass.id,
            semester_id: semester.id
        });

        const studentClasses = await StudentClass.findAll({ where: { class_id: myClass.id } });

        const evaluationsToInsert = studentClasses.map(sc => ({
            evaluation_id: evaluation.id,
            student_class_id: sc.id,
            description: null
        }));

        await StudentEvaluation.bulkCreate(evaluationsToInsert);

        res.status(201).json({ message: 'Evaluasi berhasil ditambahkan ke semua siswa', evaluation });
    } catch (error) {
        console.error('Error creating evaluation:', error);
        res.status(500).json({ message: 'Gagal menambahkan evaluasi', error: error.message });
    }
};

// Edit title evaluasi
exports.updateEvaluation = async (req, res) => {
    try {
        const { title } = req.body;
        const { id } = req.params;
        const userId = req.user.id;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Judul evaluasi harus diisi' });
        }

        // Cari evaluasi yang mau diubah
        const evaluation = await Evaluation.findByPk(id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        // Cari semester untuk ambil academic_year_id
        const semester = await Semester.findByPk(evaluation.semester_id);
        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        // Pastikan semester berada di tahun ajaran aktif
        const academicYear = await AcademicYear.findOne({
            where: { id: semester.academic_year_id, is_active: true }
        });
        if (!academicYear) {
            return res.status(400).json({ message: 'Tahun ajaran tidak aktif' });
        }

        // Cari kelas wali kelas
        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: academicYear.id }
        });
        if (!myClass) {
            return res.status(403).json({ message: 'Anda bukan wali kelas pada tahun ajaran aktif' });
        }

        // Pastikan evaluasi ini memang milik kelas wali tersebut
        if (evaluation.class_id !== myClass.id) {
            return res.status(403).json({ message: 'Anda tidak berhak mengedit evaluasi ini' });
        }

        // Cek apakah title baru sudah ada di semester dan kelas yang sama
        const existingEvaluation = await Evaluation.findOne({
            where: {
                title: title.trim(),
                class_id: myClass.id,
                semester_id: evaluation.semester_id,
                id: { [Op.ne]: evaluation.id } // selain evaluasi yang sedang diedit
            }
        });

        if (existingEvaluation) {
            return res.status(400).json({ message: 'Judul evaluasi ini sudah digunakan di semester dan kelas Anda' });
        }

        // Update evaluasi
        await evaluation.update({ title: title.trim() });

        res.json({ message: 'Evaluasi berhasil diperbarui', evaluation });

    } catch (error) {
        console.error('Error updating evaluation:', error);
        res.status(500).json({ message: 'Gagal mengedit evaluasi', error: error.message });
    }
};

// Hapus title evaluasi
exports.deleteEvaluation = async (req, res) => {
    try {
      const { id } = req.params;
      await Evaluation.destroy({ where: { id } });
      res.json({ message: 'Evaluasi berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghapus evaluasi', error });
    }
};

// daftar evaluasi siswa per judul di tiap semester
exports.getStudentEvaluations = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const evaluation = await Evaluation.findByPk(id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan' });
        }

        const semester = await Semester.findByPk(evaluation.semester_id);
        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        const academicYear = await AcademicYear.findOne({
            where: { id: semester.academic_year_id, is_active: true }
        });
        if (!academicYear) {
            return res.status(403).json({ message: 'Tahun ajaran tidak aktif' });
        }

        const myClass = await Class.findOne({
            where: { teacher_id: userId, academic_year_id: academicYear.id }
        });
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

        const result = studentEvaluations.map(se => {
            const studentData = se.student_class?.student;
            return {
                student_evaluation_id: se.id,
                name: studentData?.name || null,
                nisn: studentData?.nisn || null,
                description: se.description
            };
        });

        // Urutkan berdasarkan nama siswa (secara alfabetis)
        result.sort((a, b) => a.name.localeCompare(b.name));

        res.json(result);
    } catch (error) {
        console.error('Error fetching student evaluations:', error);
        res.status(500).json({ message: 'Gagal mengambil evaluasi siswa', error: error.message });
    }
};

// Edit deskripsi evaluasi siswa
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
        console.error('Error updating evaluation description:', error);
        res.status(500).json({ message: 'Gagal memperbarui deskripsi evaluasi', error: error.message });
    }
};

exports.getStudentEvaluations = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { parent_id: req.user.id } });
    const evaluations = await Evaluation.findAll({
      where: { semester_id: req.params.semesterId },
      include: [{
        model: StudentEvaluation,
        where: { student_id: student.id }
      }]
    });
    res.json(evaluations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil evaluasi' });
  }
};

// Daftar title evaluasi per semester
exports.getStudentTitleEvaluation = async (req, res) => {
    try {
        const { semesterId } = req.params;

        // Cek semester dan pastikan berada di tahun ajaran aktif
        const semester = await Semester.findOne({
            where: { id: semesterId },
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true }
            }
        });

        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan atau tidak aktif' });
        }

        // Cari siswa berdasarkan orang tua
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Data siswa tidak ditemukan' });

        // Cari kelas siswa di tahun ajaran aktif
        const studentClass = await StudentClass.findOne({
            where: { student_id: student.id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: semester.academic_year_id }
            }
        });

        if (!studentClass) {
            return res.status(404).json({ message: 'Kelas siswa di tahun ajaran aktif tidak ditemukan' });
        }

        // Ambil semua evaluasi yang terkait dengan kelas siswa dan semester
        const evaluations = await Evaluation.findAll({
            where: {
                class_id: studentClass.class_id,
                semester_id: semester.id
            },
            include: {
                model: Semester,
                as: 'semester',
                attributes: ['id', 'name']
            },
            order: [['title', 'ASC']]
        });

        if (evaluations.length === 0) {
            return res.status(404).json({ message: 'Belum ada evaluasi untuk semester ini' });
        }

        // Ambil nilai evaluasi siswa
        const studentEvaluations = await StudentEvaluation.findAll({
            where: {
                student_class_id: studentClass.id,
                evaluation_id: evaluations.map(e => e.id)
            }
        });

        // Gabungkan hasil evaluasi dengan nilai siswa (jika ada)
        const result = evaluations.map(evaluation => {
            const studentEval = studentEvaluations.find(se => se.evaluation_id === evaluation.id);
            return {
                id: evaluation.id,
                title: evaluation.title,
                semester_id: evaluation.semester.id,
                semester_name: evaluation.semester.name
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching evaluations for parent:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data evaluasi', error: error.message });
    }
};

// Deskripsi evaluasi per semester
exports.getStudentDescEvaluation = async (req, res) => {
    try {
        const { semesterId, evaluationId } = req.params;

        // Validasi semester dan pastikan semester berada di tahun ajaran aktif
        const semester = await Semester.findOne({
            where: { id: semesterId },
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true }
            }
        });

        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak valid atau tidak aktif' });
        }

        // Cari siswa berdasarkan parent_id
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Data siswa tidak ditemukan' });

        // Cari kelas siswa pada tahun ajaran aktif
        const studentClass = await StudentClass.findOne({
            where: { student_id: student.id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: semester.academic_year_id }
            }
        });

        if (!studentClass) {
            return res.status(404).json({ message: 'Kelas siswa pada tahun ajaran aktif tidak ditemukan' });
        }

        // Ambil data evaluasi siswa
        const studentEvaluation = await StudentEvaluation.findOne({
            where: {
                student_class_id: studentClass.id,
                evaluation_id: evaluationId
            },
            include: {
                model: Evaluation,
                as: 'evaluation',
                where: { semester_id: semesterId },
                attributes: ['id', 'title']
            }
        });

        if (!studentEvaluation) {
            return res.status(404).json({ message: 'Evaluasi tidak ditemukan untuk siswa pada semester ini.' });
        }

        const formattedEvaluation = {
            id: studentEvaluation.evaluation.id,
            title: studentEvaluation.evaluation.title,
            description: studentEvaluation.description // deskripsi penilaian dari StudentEvaluation
        };

        res.json(formattedEvaluation);
    } catch (error) {
        console.error('Error fetching evaluation detail:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil detail evaluasi', error: error.message });
    }
};