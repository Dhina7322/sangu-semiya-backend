const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', enquiryController.createEnquiry);
router.get('/', protect, enquiryController.getEnquiries);
router.put('/:id/status', protect, enquiryController.updateEnquiryStatus);

module.exports = router;
