const roleValidation = (roles) => {
    return (req, res, next) => {
        console.log("Decoded User from Token:", req.user); // ✅ Tambahkan ini untuk debug

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Akses ditolak" });
        }
        next();
    };
};

module.exports = roleValidation;
