var express = require('express');
var router = express.Router();
const userController = require('../controllers/userController');
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

// Get all users with optional role filter
router.get('/', 
    accessValidation, 
    roleValidation(["admin"]), 
    userController.getAllUsers
);

// Get single user by ID
router.get('/:id', 
    accessValidation, 
    roleValidation(["admin"]), 
    userController.getUserById
);

// Create new user
router.post('/', 
    accessValidation, 
    roleValidation(["admin"]), 
    userController.createUser
);

// Update user
router.put('/:id',  
    accessValidation, 
    roleValidation(["admin"]), 
    userController.updateUser
);

// Delete user
router.delete('/:id',  
    accessValidation, 
    roleValidation(["admin"]), 
    userController.deleteUser
);

module.exports = router;