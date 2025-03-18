const { Student } = require("../models");

const isParentValidation = async (req, res, next) => {
    try {
        const user = req.user;
        console.log("User dari token JWT:", user);

        if (!user || user.role !== "orang_tua") {
            return res.status(403).json({ message: "Access denied. Only parents can access this data." });
        }

        // Ambil siswa berdasarkan parent_id
        const students = await Student.findAll({ where: { parent_id: user.id } });

        console.log("Daftar anak ditemukan:", students.map(s => s.id));

        if (!students.length) {
            return res.status(404).json({ message: "Tidak ada siswa yang terdaftar untuk akun ini." });
        }

        req.children = students; // Simpan daftar anak di request

        next();
    } catch (error) {
        console.error("Error di isParentValidation:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

module.exports = isParentValidation;
