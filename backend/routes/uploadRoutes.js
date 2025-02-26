// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const { handleBase64Upload, handleMulterError } = require('../middleware/uploadMiddleware');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, handleBase64Upload, handleMulterError, uploadImage);

module.exports = router;