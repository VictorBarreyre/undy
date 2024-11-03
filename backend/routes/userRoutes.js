// routes/userRoutes.js
const express = require('express');
const { registerUser, loginUser,updateUserProfile, getUserProfile } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware'); // Importation du middleware

const router = express.Router();

// Route pour l'inscription
router.post('/register', registerUser);

// Route pour la connexion
router.post('/login', loginUser);

// Route pour mettre à jour le profil de l'utilisateur
router.put('/profile', protect, updateUserProfile);

// Route protégée pour obtenir le profil de l'utilisateur connecté
router.get('/profile', protect, getUserProfile); // Utilisation du middleware "protect"

module.exports = router;
