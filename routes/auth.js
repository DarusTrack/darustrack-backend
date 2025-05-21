const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const accessValidation = require("../middlewares/accessValidation");

// Authentication routes
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);

// Profile routes
router.get("/profile", accessValidation, authController.getProfile);
router.put("/profile", accessValidation, authController.updateProfile);

// Password reset routes
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;