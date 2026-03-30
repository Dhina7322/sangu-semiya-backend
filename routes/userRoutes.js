const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, isAdmin, userController.getUsers);
router.post('/subadmin', protect, isAdmin, userController.createSubAdmin);
router.put('/profile', protect, userController.updateProfile);
router.put('/:id', protect, isAdmin, userController.updateUser);
router.delete('/:id', protect, isAdmin, userController.deleteUser);

module.exports = router;
