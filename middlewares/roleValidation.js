const roleValidation = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Anda harus login terlebih dahulu" });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`Akses ditolak untuk ${req.user.role} ke route ini`);
            return res.status(403).json({ message: "Akses ditolak" });
        }

        // Pastikan wali kelas hanya dapat mengakses data di kelasnya
        if (req.user.role === 'wali_kelas' && req.user.class_id !== req.params.class_id) {
            return res.status(403).json({ message: 'You do not have permission to access this class data' });
        }
        
        next();
    };
};

module.exports = roleValidation;