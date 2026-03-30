const express = require('express');
const router = express.Router();
const homepageController = require('../controllers/homepageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', homepageController.getHomepageData);
router.put('/', protect, homepageController.updateHomepageData);

module.exports = router;
