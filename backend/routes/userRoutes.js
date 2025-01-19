// routes/userRoutes.js
const express = require('express');
const { registerUser, loginUser,updateUserProfile, getUserProfile, uploadProfilePicture, downloadUserData, clearUserData, deleteUserAccount } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware'); // Importation du middleware
const upload = require('../middleware/uploadMiddleware'); 

const router = express.Router();

// Route pour l'inscription
router.post('/register', registerUser);

// Route pour la connexion
router.post('/login', loginUser);

// Route pour mettre à jour le profil de l'utilisateur
router.put('/profile', protect, updateUserProfile);

// Route protégée pour obtenir le profil de l'utilisateur connecté
router.get('/profile', protect, getUserProfile); // Utilisation du middleware "protect"

// Route pour télécharger une photo de profil
router.put('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

// Nouvelle route pour télécharger les données de l'utilisateur
router.get('/download', protect, downloadUserData);

// Nouvelle route pour effacer les données de l'utilisateur
router.delete('/clear', protect, clearUserData);

// Nouvelle route pour supprimer le compte de l'utilisateur
router.delete('/delete', protect, deleteUserAccount);

module.exports = router;
