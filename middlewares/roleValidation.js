const roleValidation = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Anda harus login terlebih dahulu" });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`Akses ditolak untuk ${req.user.role} ke route ini`);
            return res.status(403).json({ message: "Akses ditolak" });
        }

        next();
    };
};

module.exports = roleValidation;