const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Get all products
router.get('/', productController.getProducts);

// Get single product
router.get('/:id', productController.getProductById);

// Create product (with optional local images)
router.post('/', protect, upload.array('images', 10), productController.createProduct);

// Update product (with optional local images)
router.put('/:id', protect, upload.array('images', 10), productController.updateProduct);

// Delete product
router.delete('/:id', protect, productController.deleteProduct);

// CSV Bulk Operations
router.get('/utils/export', protect, productController.exportProducts);
router.post('/utils/import', protect, upload.single('csvFile'), productController.importProducts);

// Amazon Tools
router.post('/fetch-amazon-price', protect, productController.fetchAmazonPrice);

module.exports = router;
