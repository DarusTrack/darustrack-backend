const jwt = require("jsonwebtoken");
require("dotenv").config();

const accessValidation = (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token diperlukan atau format salah" });
    }

    const token = authorization.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({ message: "Server error: JWT_SECRET tidak diatur" });
    }

    try {
        const jwtDecode = jwt.verify(token, secret);
        req.user = jwtDecode; // Simpan data pengguna dari token
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = accessValidation;
