// routes/moderationRoutes.js

const express = require('express');
const router = express.Router();
const { moderateContent, moderationMiddleware } = require('../controllers/sighteningController');
const protect = require('../middleware/authMiddleware');

// Route pour modérer du contenu (pour les appels depuis le client)
router.post('/', protect, moderateContent);

// Exportation du middleware pour utilisation dans d'autres routes
// Utilisez ce middleware pour protéger les routes qui nécessitent une modération
exports.moderation = moderationMiddleware;

module.exports = router;