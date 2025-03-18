const { Class } = require('../models');

const isWaliKelas = async (req, res, next) => {
    try {
        const { user } = req;
        const { classId } = req.params;

        if (user.role !== "wali_kelas") {
            return res.status(403).json({ message: "Akses ditolak. Anda bukan wali kelas." });
        }

        const kelas = await Class.findOne({ where: { id: classId, teacher_id: user.id } });

        if (!kelas) {
            return res.status(403).json({ message: "Akses ditolak. Anda bukan wali kelas dari kelas ini." });
        }

        next();
    } catch (error) {
        console.error("Error in isWaliKelas middleware:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
};

module.exports = { isWaliKelas };