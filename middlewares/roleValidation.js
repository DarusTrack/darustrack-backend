const roleValidation = (roles) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Anda harus login terlebih dahulu" });
        }

        if (!roles.includes(user.role)) {
            console.warn(`Akses ditolak untuk role: ${user.role}`);
            return res.status(403).json({ message: "Akses ditolak" });
        }

        // Optimasi: hanya validasi class_id jika memang diperlukan
        if (user.role === 'wali_kelas') {
            const requestedClassId = parseInt(req.params.class_id, 10);
            if (!requestedClassId || user.class_id !== requestedClassId) {
                return res.status(403).json({ message: "Anda tidak memiliki akses ke data kelas ini" });
            }
        }

        if (user.role === 'kepala_sekolah' && req.params.class_id) {
            return res.status(403).json({ message: "Kepala sekolah tidak perlu menggunakan class_id di URL" });
        }

        next();
    };
};

module.exports = roleValidation;
