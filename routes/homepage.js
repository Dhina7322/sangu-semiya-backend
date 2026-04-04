const express = require('express');
const router = express.Router();
const homepageController = require('../controllers/homepageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', homepageController.getHomepageData);
router.put('/', protect, upload.single('backgroundImage'), homepageController.updateHomepageData);
router.post('/media-upload', protect, upload.single('image'), homepageController.uploadHomepageMedia);

module.exports = router;
