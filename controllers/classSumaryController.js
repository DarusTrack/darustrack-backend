const {
    Class, StudentGrade, Student, GradeCategory, GradeDetail,
    Attendance, Subject, AcademicYear, Semester, StudentClass
  } = require('../models');
  
  const getActiveAcademicYearAndSemester = async () => {
    const academicYear = await AcademicYear.findOne({ where: { is_active: true } });
    if (!academicYear) throw new Error('No active academic year found');
  
    const semester = await Semester.findOne({
      where: {
        academic_year_id: academicYear.id,
        is_active: true
      }
    });
    if (!semester) throw new Error('No active semester found');
  
    return { academicYear, semester };
  };
  
  // GET - Summary semua kelas (kepala sekolah)
  exports.getClassSummaries = async (req, res) => {
    try {
      const { academicYear, semester } = await getActiveAcademicYearAndSemester();
  
      const classes = await Class.findAll({
        where: { academic_year_id: academicYear.id },
        include: [{
          model: StudentClass,
          as: 'student_class',
          include: [
            {
              model: Attendance,
              as: 'attendance',
              where: { semester_id: semester.id },
              required: false,
              attributes: ['status']
            },
            {
              model: StudentGrade,
              as: 'student_grade',
              attributes: ['score'],
              include: [{
                model: GradeDetail,
                as: 'grade_detail',
                include: [{
                  model: GradeCategory,
                  as: 'grade_category',
                  where: { semester_id: semester.id },
                  attributes: []
                }]
              }],
              required: false
            }
          ]
        }]
      });
  
      const formatted = classes.map(cls => {
        const gradeMatch = cls.name.match(/\d+/);
        const grade_level = gradeMatch ? parseInt(gradeMatch[0]) : null;
        const total_students = cls.student_class.length;
  
        const totalScore = cls.student_class.reduce((acc, sc) =>
          acc + sc.student_grade.reduce((s, g) => s + (g.score || 0), 0), 0);
        const totalGrades = cls.student_class.reduce((acc, sc) => acc + sc.student_grade.length, 0);
  
        const present = cls.student_class.reduce((acc, sc) =>
          acc + sc.attendance.filter(a => a.status === 'Hadir').length, 0);
        const attendanceTotal = cls.student_class.reduce((acc, sc) => acc + sc.attendance.length, 0);
  
        return {
          id: cls.id,
          name: cls.name,
          grade_level,
          total_students,
          average_score: totalGrades ? (totalScore / totalGrades).toFixed(2) : "0.00",
          attendance_percentage: attendanceTotal ? `${((present / attendanceTotal) * 100).toFixed(1)}%` : '0%'
        };
      });
  
      formatted.sort((a, b) => a.grade_level - b.grade_level || a.name.localeCompare(b.name));
      res.json(formatted);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  };
  
  // GET - Detail kelas
  exports.getClassDetail = async (req, res) => {
    try {
      const { classId } = req.params;
      const { academicYear, semester } = await getActiveAcademicYearAndSemester();
  
      const classData = await Class.findOne({
        where: { id: classId, academic_year_id: academicYear.id },
        include: [{
          model: StudentClass,
          as: 'student_class',
          include: [
            { model: Student, as: 'student' },
            {
              model: Attendance,
              as: 'attendance',
              where: { semester_id: semester.id },
              required: false,
              attributes: ['status']
            },
            {
              model: StudentGrade,
              as: 'student_grade',
              required: false,
              include: [{
                model: GradeDetail,
                as: 'grade_detail',
                include: [{
                  model: GradeCategory,
                  as: 'grade_category',
                  where: { semester_id: semester.id },
                  attributes: ['subject_id'],
                  include: [{
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                  }]
                }]
              }]
            }
          ]
        }]
      });
  
      if (!classData) return res.status(404).json({ message: 'Class not found or not in active academic year.' });
  
      const total_students = classData.student_class.length;
      const subjectScores = {};
      const studentRankings = [];
  
      let totalScore = 0, totalGradeCount = 0;
      let present = 0, attendanceTotal = 0;
  
      for (const sc of classData.student_class) {
        const grades = sc.student_grade;
        const attendances = sc.attendance;
        let studentScoreSum = 0, studentGradeCount = 0;
  
        for (const g of grades) {
          const subject = g.grade_detail?.grade_category?.subject;
          if (!subject) continue;
  
          if (!subjectScores[subject.id]) {
            subjectScores[subject.id] = { subject_id: subject.id, subject_name: subject.name, scores: [] };
          }
          subjectScores[subject.id].scores.push(g.score);
          studentScoreSum += g.score;
          studentGradeCount++;
        }
  
        if (studentGradeCount > 0) {
          studentRankings.push({
            id: sc.student.id,
            name: sc.student.name,
            average_score: parseFloat((studentScoreSum / studentGradeCount).toFixed(2))
          });
          totalScore += studentScoreSum;
          totalGradeCount += studentGradeCount;
        }
  
        present += attendances.filter(a => a.status === 'Hadir').length;
        attendanceTotal += attendances.length;
      }
  
      const average_score_per_subject = Object.values(subjectScores).map(s => ({
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        average_score: parseFloat((s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(2))
      }));
  
      studentRankings.sort((a, b) => b.average_score - a.average_score);
      let rank = 1, tie = 0, prevScore = null;
  
      for (let i = 0; i < studentRankings.length; i++) {
        const student = studentRankings[i];
        if (student.average_score === prevScore) {
          student.rank = rank;
          tie++;
        } else {
          rank += tie;
          student.rank = rank;
          tie = 1;
        }
        prevScore = student.average_score;
      }
  
      const grade_level = parseInt(classData.name.match(/\d+/)?.[0] || 0);
      const overall_average_score = totalGradeCount ? parseFloat((totalScore / totalGradeCount).toFixed(2)) : 0;
      const attendance_percentage = attendanceTotal ? `${((present / attendanceTotal) * 100).toFixed(1)}%` : '0%';
  
      res.json({
        id: classData.id,
        name: classData.name,
        grade_level,
        total_students,
        average_score_per_subject,
        overall_average_score,
        attendance_percentage,
        student_rankings: studentRankings
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };
  