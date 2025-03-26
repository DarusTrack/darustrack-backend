const { Class } = require('../models');

const isWaliKelas = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User data not found in request" });
        }

        const { user } = req;
        console.log("Checking wali kelas role for:", user); // Debugging log

        if (user.role !== "wali_kelas") {
            return res.status(403).json({ message: "Akses ditolak. Anda bukan wali kelas." });
        }

        const kelas = await Class.findOne({ where: { teacher_id: user.id } });

        if (!kelas) {
            return res.status(403).json({ message: "Akses ditolak. Anda tidak memiliki kelas." });
        }

        req.class = kelas;
        next();
    } catch (error) {
        console.error("Error in isWaliKelas middleware:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
};

module.exports = isWaliKelas;

