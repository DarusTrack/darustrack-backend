const jwt = require("jsonwebtoken");
const { User } = require("../models");

const accessValidation = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }

        // Ambil hanya field yang dibutuhkan, hindari ambil semua kolom
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'email', 'role']
        });

        if (!user) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        req.user = user;  // untuk digunakan di middleware selanjutnya
        next();
    } catch (error) {
        console.error("accessValidation error:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = accessValidation;
