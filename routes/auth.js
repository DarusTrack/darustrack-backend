var express = require('express');
var router = express.Router();
const authController = require('../controllers/authController');
const accessValidation = require('../middlewares/accessValidation');

router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/request-reset", authController.requestReset);
router.post("/reset-password", authController.resetPassword);
router.get("/profile", accessValidation, authController.getProfile);
router.put("/profile", accessValidation, authController.updateProfile);
router.post("/logout", authController.logout);

module.exports = router;