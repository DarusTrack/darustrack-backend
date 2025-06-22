const { Semester } = require('../models');

const loadActiveSemester = async (req, res, next) => {
    try {
        const semester = await Semester.findOne({ where: { is_active: true } });
        if (!semester) return res.status(404).json({ message: 'Semester aktif tidak ditemukan' });
        req.activeSemester = semester;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal memuat semester aktif', error: err.message });
    }
};

module.exports = {
    loadActiveSemester
};