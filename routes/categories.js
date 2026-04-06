const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', categoryController.getCategories);
router.post('/', protect, categoryController.createCategory);
router.put('/:id', protect, categoryController.updateCategory);
router.delete('/:id', protect, categoryController.deleteCategory);

// Specialized assignment route
router.post('/:id/assign-products', protect, categoryController.assignProducts);

module.exports = router;
