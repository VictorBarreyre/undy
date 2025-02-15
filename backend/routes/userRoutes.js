// routes/userRoutes.js
const express = require('express');
const { 
    registerUser,
    loginUser,
    googleLogin,
    refreshToken,
    updateUserProfile,
    getUserProfile,
    uploadProfilePicture,
    verifyStripeIdentity,
    downloadUserData,
    getUserTransactions,
    createTransferIntent,
    clearUserData,
    deleteUserAccount,
    getUserById } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware'); // Importation du middleware
const { uploadMiddleware, handleMulterError } = require('../middleware/uploadMiddleware');
const router = express.Router();
const multer = require('multer');


// Route pour l'inscription
router.post('/register', registerUser);

// Route pour la connexion
router.post('/login', loginUser);

router.post('/google-login', googleLogin);

router.post('/refresh-token', refreshToken);

// Route pour mettre à jour le profil de l'utilisateur
router.put('/profile', protect, updateUserProfile);

// Route protégée pour obtenir le profil de l'utilisateur connecté
router.get('/profile', protect, getUserProfile); // Utilisation du middleware "protect"

router.get('/transactions', protect, getUserTransactions);

router.post('/create-transfer-intent', protect, createTransferIntent);


// Route pour télécharger une photo de profil
router.put(
    '/profile-picture',
    protect,
    (req, res, next) => {
        uploadMiddleware.single('profilePicture')(req, res, (err) => {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({
                    message: 'Erreur lors du téléchargement',
                    error: err.message
                });
            }
            next();
        });
    },
    uploadProfilePicture
);

router.post(
    '/verify-stripe-identity', 
    protect,
    (req, res, next) => {
        uploadMiddleware.single('identityDocument')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Erreur de Multer lors du téléchargement
                return res.status(400).json({
                    success: false,
                    message: 'Erreur lors du téléchargement du fichier',
                    error: err.message
                });
            } else if (err) {
                // Autres erreurs
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors du traitement du fichier',
                    error: err.message
                });
            }
            next();
        });
    },
    verifyStripeIdentity
);

// Nouvelle route pour télécharger les données de l'utilisateur
router.get('/download', protect, downloadUserData);

// Nouvelle route pour effacer les données de l'utilisateur
router.delete('/clear', protect, clearUserData);

// Nouvelle route pour supprimer le compte de l'utilisateur
router.delete('/delete', protect, deleteUserAccount);

// Nouvelle route pour récupérer les informations d'un utilisateur par ID
router.get('/:id', protect, getUserById);

module.exports = router;
