const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// Get daftar pengguna berdasarkan role
router.get('/', accessValidation, roleValidation(["admin"]), userController.getAllUsers);

// Get pengguna berdasarkan ID
router.get('/:id', accessValidation, roleValidation(["admin"]), userController.getDetailUser);

// Tambah pengguna baru (Register)
router.post('/', accessValidation, roleValidation(["admin"]), userController.addUser);

// Update pengguna
router.put('/:id',  accessValidation, roleValidation(["admin"]), userController.updateUser);

// Hapus pengguna
router.delete('/:id',  accessValidation, roleValidation(["admin"]), userController.deleteUser);

module.exports = router;