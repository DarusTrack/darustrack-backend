const { Student } = require('../models'); // Import model Student

const isParentValidation = async (req, res, next) => {
    try {
        // Ambil user dari request (diasumsikan telah diset di middleware autentikasi)
        const user = req.user; // Dari token JWT
        const studentId = req.params.id; // ID siswa dari request params

        // Pastikan user adalah orang tua
        if (user.role !== 'orang_tua') {
            return res.status(403).json({ message: "Access denied. Only parents can access this data." });
        }

        // Cari data siswa berdasarkan ID
        const student = await Student.findByPk(studentId);

        // Jika siswa tidak ditemukan
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Pastikan parent_id siswa sesuai dengan ID orang tua yang sedang login
        if (student.parent_id !== user.id) {
            return res.status(403).json({ message: "Access denied. You can only view your own child's data." });
        }

        // Jika lolos semua validasi, lanjut ke handler berikutnya
        next();
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

module.exports = isParentValidation;
