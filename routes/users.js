const express = require('express');
const router = express.Router();
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

router.get('/', accessValidation, roleValidation(['admin']), getAllUsers);
router.get('/:id', accessValidation, roleValidation(['admin']), getUserById);
router.post('/', accessValidation, roleValidation(['admin']), createUser);
router.put('/:id', accessValidation, roleValidation(['admin']), updateUser);
router.delete('/:id', accessValidation, roleValidation(['admin']), deleteUser);

module.exports = router;
