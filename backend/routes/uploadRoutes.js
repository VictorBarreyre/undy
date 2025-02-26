// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, uploadImage);

module.exports = router;