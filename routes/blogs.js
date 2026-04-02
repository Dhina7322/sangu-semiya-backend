const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
// const { authenticate } = require('../middleware/auth'); // If you want to protect routes

// Public routes
router.get('/', blogController.getBlogs);
router.get('/:slug', blogController.getBlogBySlug);

// Private routes (protected by admin authentication)
router.post('/', blogController.createBlog);
router.put('/:id', blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
