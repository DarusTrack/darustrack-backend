const roleValidation = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Anda harus login terlebih dahulu" });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`Akses ditolak untuk ${req.user.role} ke route ini`);
            return res.status(403).json({ message: "Akses ditolak" });
        }

        if (req.user.role === 'wali_kelas' && req.user.class_id !== req.params.class_id) {
            return res.status(403).json({ message: 'You do not have permission to access this class data' });
        }

        if (req.user.role === 'kepala_sekolah' && req.params.class_id) {
            return res.status(403).json({ message: 'Kepala sekolah tidak memerlukan class_id di URL' });
        }
        
        next();
    };
};

module.exports = roleValidation;