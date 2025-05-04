const express = require("express");
const router = express.Router();
const accessValidation = require("../middlewares/accessValidation");

const {
  login,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  logout
} = require("../controllers/authController");

// Auth routes
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/profile", accessValidation, getProfile);
router.put("/profile", accessValidation, updateProfile);
router.post("/logout", logout);

module.exports = router;
