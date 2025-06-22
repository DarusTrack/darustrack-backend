const { Semester, AcademicYear } = require('../models');

// Daftar semester tahun ajaran aktif (kehadiran dan evaluasi)
exports.getActiveSemesters = async (_, res) => {
  try {
    const activeYear = await AcademicYear.findOne({
      where: { is_active: true },
      include: { model: Semester, as: 'semester' }
    });
    if (!activeYear) return res.status(404).json({ message: 'Tahun ajaran aktif tidak ditemukan' });
    return res.json({ semesters: activeYear.semester });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil semester', error: e.message });
  }
};

exports.updateSemesterStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ message: 'is_active harus berupa boolean' });
        }

        const semesterToUpdate = await Semester.findByPk(req.params.id);
        if (!semesterToUpdate) {
            return res.status(404).json({ message: 'Semester tidak ditemukan' });
        }

        const academicYear = await AcademicYear.findByPk(semesterToUpdate.academic_year_id);
        if (!academicYear || !academicYear.is_active) {
            return res.status(400).json({ message: 'Semester ini tidak berasal dari tahun ajaran aktif' });
        }

        if (is_active) {
            await Semester.update({ is_active: false }, {
                where: { academic_year_id: academicYear.id }
            });
        }

        semesterToUpdate.is_active = is_active;
        await semesterToUpdate.save();

        res.json({ message: `Semester berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};