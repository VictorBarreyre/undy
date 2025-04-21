// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadImage, uploadAudio, uploadVideo, handleModerationWebhook } = require('../controllers/uploadController');
const { imageUploadMiddleware, audioUploadMiddleware, videoUploadMiddleware, handleBase64Upload, handleBase64AudioUpload, handleBase64VideoUpload, handleMulterError, cleanupTempFiles } = require('../middleware/uploadMiddleware');
const protect = require('../middleware/authMiddleware');

// Upload d'image - gère à la fois le base64 et les fichiers
router.post('/image', protect, handleBase64Upload, handleMulterError, uploadImage);

// Upload d'audio - gère à la fois le base64 et les fichiers
router.post('/audio', protect, handleBase64AudioUpload, handleMulterError, uploadAudio);

// Upload de vidéo - gère à la fois le base64 et les fichiers
router.post('/video', protect, handleBase64VideoUpload, handleMulterError, uploadVideo);

// Webhook pour la modération asynchrone
router.post('/moderation-webhook', handleModerationWebhook);

module.exports = router;