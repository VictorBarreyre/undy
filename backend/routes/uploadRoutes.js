const express = require('express');
const router = express.Router();
const { uploadImage, uploadAudio } = require('../controllers/uploadController');
const { handleBase64Upload, handleMulterError } = require('../middleware/uploadMiddleware');
const protect = require('../middleware/authMiddleware');

// Upload d'image
router.post('/image', protect, handleBase64Upload, handleMulterError, uploadImage);

// Upload d'audio
router.post('/audio', protect, uploadAudio);

module.exports = router;