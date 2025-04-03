// routes/linkPreviewRoutes.js
const express = require('express');
const router = express.Router();
const linkPreviewController = require('../controllers/linkPreviewController');

// Route pour récupérer les métadonnées d'une URL
router.get('/getDataLink', linkPreviewController.getDataLink);

module.exports = router;