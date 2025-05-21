const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// Helper error wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET / - List users by role
router.get('/', asyncHandler(UserController.listUsers));

// GET /:id - Get user by ID
router.get('/:id', asyncHandler(UserController.getUser));

// POST / - Create user
router.post('/', asyncHandler(UserController.createUser));

// PUT /:id - Update user
router.put('/:id', asyncHandler(UserController.updateUser));

// DELETE /:id - Delete user
router.delete('/:id', asyncHandler(UserController.deleteUser));

module.exports = router;