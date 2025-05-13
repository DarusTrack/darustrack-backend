const { Op } = require('sequelize');
const { GradeCategory, GradeDetail, StudentGrade, Class, AcademicYear, Subject, Student } = require('../models');

// list mapel sesuai jadwal
exports.getAllGradeSubjects = async (req, res) => {
    try {
        // 1. Cari tahun ajaran aktif
        const activeAcademicYear = await AcademicYear.findOne({ where: { is_active: true } });

        if (!activeAcademicYear) {
            return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        // 2. Cari kelas wali berdasarkan user.id dan tahun ajaran aktif
        const teacherClass = await Class.findOne({
            where: {
                teacher_id: req.user.id,
                academic_year_id: activeAcademicYear.id
            }
        });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar di tahun ajaran aktif' });
        }

        // 3. Ambil jadwal kelas beserta mata pelajaran
        const schedules = await Schedule.findAll({
            where: { class_id: teacherClass.id },
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                }
            ],
            attributes: ['subject_id']
        });

        // 4. Ambil daftar mata pelajaran unik
        const uniqueSubjects = [];
        const subjectSet = new Set();

        schedules.forEach(schedule => {
            if (!subjectSet.has(schedule.subject.id)) {
                uniqueSubjects.push({
                    subject_id: schedule.subject.id,
                    subject_name: schedule.subject.name
                });
                subjectSet.add(schedule.subject.id);
            }
        });

        // 5. Urutkan berdasarkan nama mata pelajaran
        uniqueSubjects.sort((a, b) => a.subject_name.localeCompare(b.subject_name));

        res.json(uniqueSubjects);
    } catch (error) {
        console.error("Error fetching subjects for academic grades:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// kategori penilaian setiap mapel
exports.getAllCategoryGrades = async (req, res) => {
      try {
        const { subject_id, semester_id } = req.params;
  
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
        if (!teacherClass) {
          return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }
  
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
        console.error('Error fetching grade categories:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
      }
};  

// tambah kategori
exports.addCategoryGrade = async (req, res) => {
      try {
        const { subject_id, semester_id } = req.params;
        const { name } = req.body;
  
        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
  
        if (!teacherClass) {
          return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }
  
        const classId = teacherClass.id;
  
        // Cek apakah kategori sudah ada untuk kombinasi kelas, mata pelajaran, semester, dan nama
        const existingCategory = await GradeCategory.findOne({
          where: {
            subject_id,
            class_id: classId,
            semester_id,
            name
          }
        });
  
        if (existingCategory) {
          return res.status(400).json({ message: 'Kategori sudah ada untuk mata pelajaran dan semester ini' });
        }
  
        // Jika belum ada, buat kategori baru
        const newCategory = await GradeCategory.create({
          subject_id,
          class_id: classId,
          semester_id,
          name
        });
  
        res.status(201).json(newCategory);
      } catch (error) {
        console.error('Error creating grade category:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
      }
};

// Edit kategori penilaian
exports.updateCategoryGrade = async (req, res) => {
    try {
        const { category_id } = req.params;
        const { name } = req.body;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Cek apakah kategori ada
        const categoryExists = await GradeCategory.findOne({ where: { id: category_id } });

        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Cek apakah nama baru sudah digunakan dalam kelas dan mata pelajaran yang sama
        const duplicateCategory = await GradeCategory.findOne({
            where: { name, class_id: classId, subject_id: categoryExists.subject_id, id: { [Op.ne]: category_id } }
        });

        if (duplicateCategory) {
            return res.status(400).json({ message: 'Category name already exists for this class and subject' });
        }

        // Update kategori
        await GradeCategory.update({ name }, { where: { id: category_id } });

        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Hapus kategori penilaian
exports.deleteCategoryGrade = async (req, res) => {
    try {
        const { category_id } = req.params;

        // Ambil class_id berdasarkan teacher_id
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });

        if (!teacherClass) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas yang diajar' });
        }

        const classId = teacherClass.id; // Mendapatkan class_id dari teacherClass

        // Cek apakah kategori ada
        const categoryExists = await GradeCategory.findOne({ where: { id: category_id, class_id: classId } });

        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Hapus semua detail penilaian yang terkait
        await GradeDetail.destroy({ where: { grade_category_id: category_id } });

        // Hapus kategori penilaian
        await GradeCategory.destroy({ where: { id: category_id } });

        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// get detail penilaian dalam kategori
exports.getDetailCategoryGrade = async (req, res) => {
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

// tambah detail penilaian (macam-macam)
exports.addDetailCategoryGrade = async (req, res) => {
    try {
        const { category_id } = req.params;
        const { name, date } = req.body;

        // 1. Validasi kategori penilaian
        const category = await GradeCategory.findOne({ where: { id: category_id } });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // 2. Ambil kelas wali berdasarkan user login
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || teacherClass.id !== category.class_id) {
            return res.status(403).json({ message: 'Access denied to this category' });
        }

        // 3. Cek apakah detail penilaian dengan nama yang sama sudah ada
        const existing = await GradeDetail.findOne({
            where: {
                grade_category_id: category_id,
                name,
            },
        });
        if (existing) {
            return res.status(400).json({ message: 'Detail already exists in this category' });
        }

        // 4. Buat GradeDetail baru
        const newDetail = await GradeDetail.create({
            grade_category_id: category_id,
            name,
            date,
        });

        // 5. Ambil semua siswa di kelas wali
        const studentClasses = await StudentClass.findAll({
            where: { class_id: teacherClass.id }
        });

        // 6. Buat nilai kosong (null) untuk tiap siswa
        const studentGrades = studentClasses.map(sc => ({
            student_class_id: sc.id,
            grade_detail_id: newDetail.id,
            score: null
        }));
        await StudentGrade.bulkCreate(studentGrades);

        return res.status(201).json({ message: 'Detail created and grades initialized', newDetail });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: 'Server error',
            error: e.message
        });
    }
};

// Edit detail penilaian (macam-macam)
exports.updateDetailCategoryGrade = async (req, res) => {
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

        // Cek duplikat hanya jika 'name' diubah
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

        // Update name dan/atau date
        await gradeDetail.update({
            name: name || gradeDetail.name,
            date: date || gradeDetail.date
        });

        res.json({ message: 'Detail category updated' });
    } catch (e) {
        console.error(e); // Debug
        res.status(500).json({ message: 'Server error', error: e.message });
    }
};

// Hapus detail penilaian (macam-macam)
exports.deleteDetailCategoryGrade = async (req, res) => {
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

// Ambil skor siswa untuk suatu grade detail
exports.getAllScoreStudents = async (req, res) => {
    try {
        const { detail_id } = req.params;

        // 1. Ambil detail penilaian dengan relasi kategori dan kelas
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

        // 2. Pastikan wali kelas hanya bisa akses kelasnya
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || gradeDetail.grade_category.class.id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 3. Ambil semua siswa dan skor (null jika belum dinilai), urut berdasarkan nama siswa
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

// edit skor
exports.updateScoreStudent = async (req, res) => {
    try {
        const { student_grade_id } = req.params;
        const { score } = req.body;

        // Validasi skor
        if (score === undefined || score === null || isNaN(score)) {
            return res.status(400).json({ message: 'Invalid score' });
        }

        // Ambil data StudentGrade beserta GradeDetail dan Class
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

        // Pastikan wali kelas hanya bisa mengubah nilai di kelasnya
        const teacherClass = await Class.findOne({ where: { teacher_id: req.user.id } });
        if (!teacherClass || studentGrade.grade_detail.grade_category.class.id !== teacherClass.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Jika student_class_id belum ada, coba isi otomatis
        if (!studentGrade.student_class_id) {
            const gradeClassId = studentGrade.grade_detail.grade_category.class.id;

            // Coba dapatkan student_id dari relasi StudentClass > Student
            let studentId = studentGrade.student_class?.student?.id;

            // Kalau tidak tersedia dari relasi, coba ambil dari DB langsung (opsional, jaga-jaga)
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

        // Update skor
        studentGrade.score = score;
        await studentGrade.save();

        return res.json({ message: 'Score updated successfully' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error', error: e.message });
    }
};

// Daftar Mata Pelajaran Anak
exports.getStudentSubjectGrades = async (req, res) => {
    try {
        const { semesterId } = req.params;

        // Ambil semester & pastikan relasi ke tahun ajaran aktif
        const semester = await Semester.findOne({
            where: { id: semesterId },
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true },
                attributes: ['id', 'year', 'is_active']
            }
        });
        if (!semester) return res.status(404).json({ message: 'Semester tidak ditemukan atau tidak berada di tahun ajaran aktif' });

        // Ambil data siswa berdasarkan user parent
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Data siswa tidak ditemukan' });

        // Cari studentClass berdasarkan tahun ajaran aktif
        const studentClass = await StudentClass.findOne({
            where: { student_id: student.id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: semester.academic_year_id }
            }
        });
        if (!studentClass) return res.status(404).json({ message: 'Kelas siswa untuk tahun ajaran aktif tidak ditemukan' });

        // Ambil semua jadwal kelas berdasarkan class_id
        const schedules = await Schedule.findAll({
            where: {
                class_id: studentClass.class_id
            },
            include: {
                model: Subject,
                as: 'subject',
                attributes: ['id', 'name']
            }
        });

        // Buat list mata pelajaran unik dari jadwal
        const uniqueSubjectsMap = {};
        schedules.forEach(schedule => {
            const subj = schedule.subject;
            if (subj && !uniqueSubjectsMap[subj.id]) {
                uniqueSubjectsMap[subj.id] = {
                    ...subj.toJSON(),
                    semester_id: semester.id,
                    semester_name: semester.name,
                    academic_year_id: semester.academic_year.id,
                    academic_year_name: semester.academic_year.year,
                    is_academic_year_active: semester.academic_year.is_active
                };
            }
        });

        // Konversi ke array dan urutkan berdasarkan nama
        const uniqueSubjects = Object.values(uniqueSubjectsMap);
        uniqueSubjects.sort((a, b) => a.name.localeCompare(b.name));

        res.json(uniqueSubjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data mata pelajaran', error: error.message });
    }
};

// Daftar Kategori mapel Anak
exports.getStudentCategorySubject = async (req, res) => {
    try {
        const { semesterId, subjectId } = req.params;

        // 1. Validasi semester dan tahun ajaran aktif
        const semester = await Semester.findOne({
            where: { id: semesterId },
            include: {
                model: AcademicYear,
                as: 'academic_year',
                where: { is_active: true },
                attributes: ['id', 'year']
            }
        });

        if (!semester) {
            return res.status(404).json({ message: 'Semester tidak ditemukan atau tidak berada di tahun ajaran aktif.' });
        }

        // 2. Ambil siswa dan kelasnya berdasarkan tahun ajaran aktif
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) {
            return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });
        }

        const studentClass = await StudentClass.findOne({
            where: { student_id: student.id },
            include: {
                model: Class,
                as: 'class',
                where: { academic_year_id: semester.academic_year.id }
            }
        });

        if (!studentClass) {
            return res.status(404).json({ message: 'Kelas siswa di tahun ajaran aktif tidak ditemukan.' });
        }

        // 3. Ambil kategori penilaian
        const gradeCategories = await GradeCategory.findAll({
            where: {
                subject_id: subjectId,
                semester_id: semesterId,
                class_id: studentClass.class_id
            },
            order: [['name', 'ASC']],
            attributes: ['id', 'name']
        });

        res.json(gradeCategories);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Detail Kategori (nilai dari jenis kategori)
exports.getStudentDetailCategory = async (req, res) => {
    try {
        // 1. Dapatkan student berdasarkan parent
        const student = await Student.findOne({ where: { parent_id: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Siswa tidak ditemukan' });

        // 2. Dapatkan grade category untuk validasi class
        const gradeCategory = await GradeCategory.findByPk(req.params.gradeCategoryId);
        if (!gradeCategory) return res.status(404).json({ message: 'Kategori nilai tidak ditemukan' });

        // 3. Cari student class yang sesuai dengan class di grade category
        const studentClass = await StudentClass.findOne({
            where: {
                student_id: student.id,
                class_id: gradeCategory.class_id // Pastikan class sesuai dengan grade category
            }
        });
        if (!studentClass) return res.status(404).json({ message: 'Siswa tidak terdaftar di kelas ini' });

        // 4. Query grade details dengan student grade yang sesuai
        const gradeDetails = await GradeDetail.findAll({
            where: { grade_category_id: req.params.gradeCategoryId },
            include: {
                model: StudentGrade,
                as: 'student_grade',
                where: { student_class_id: studentClass.id },
                required: false // Tetap tampilkan detail meski belum ada nilai
            }
        });

        // 5. Transformasi data
        const result = gradeDetails.map(detail => ({
            title: detail.name,
            date: detail.date,
            day: new Date(detail.date).toLocaleString('id-ID', { weekday: 'long' }),
            score: detail.student_grade.length > 0 ? detail.student_grade[0].score : null
        }));

        // 6. Urutkan berdasarkan tanggal
        result.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};