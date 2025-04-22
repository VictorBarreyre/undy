// routes/moderationRoutes.js
const express = require('express');
const router = express.Router();
const { 
  moderateContent, 
  moderateImage, 
  submitVideoForModeration,
  checkVideoModerationStatus,
  moderationMiddleware 
} = require('../controllers/moderationController');
const protect = require('../middleware/authMiddleware');
const { 
  imageUploadMiddleware, 
  videoUploadMiddleware, 
  handleMulterError,
  cleanupTempFiles
} = require('../middleware/uploadMiddleware');

// Route pour modération de texte
router.post('/', protect, moderateContent);

// Route pour modération d'image
router.post('/image', protect, imageUploadMiddleware.single('image'), handleMulterError, cleanupTempFiles, moderateImage);

// Route pour modération d'image par URL
router.post('/image-url', protect, moderateImage);

// Route pour soumettre une vidéo pour modération
router.post('/video', protect, videoUploadMiddleware.single('video'), handleMulterError, cleanupTempFiles, submitVideoForModeration);

// Route pour vérifier le statut d'une modération vidéo
router.get('/video-status/:workflowId', protect, checkVideoModerationStatus);

// Exporter le middleware pour utilisation dans d'autres routes
exports.moderationMiddleware = moderationMiddleware;

module.exports = router;