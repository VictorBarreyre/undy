// routes/userRoutes.js
const express = require('express');
const { 
    appleLogin,
    handleAppleNotifications,
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
    checkContactsInApp,
    getUserById } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware'); // Importation du middleware
const { uploadMiddleware, handleMulterError } = require('../middleware/uploadMiddleware');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');



router.post('/apple-login', appleLogin);

router.post('/apple-notifications', handleAppleNotifications);

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

const { uploadImage } = require('../controllers/uploadController');

// Route pour télécharger une photo de profil
router.post('/profile-picture', protect, async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: 'Aucune image fournie' });
      }
      
      // Utiliser le contrôleur uploadImage existant mais avec un dossier spécifique
      const cloudinaryOptions = {
        folder: 'profile_images',
        resource_type: 'image',
      };
      
      // Uploader l'image vers Cloudinary
      const uploadResult = await cloudinary.uploader.upload(image, cloudinaryOptions);
      
      // Mettre à jour le profil utilisateur avec l'URL retournée
      await User.findByIdAndUpdate(
        req.user.id,
        { profilePicture: uploadResult.secure_url }
      );
      
      // Renvoyer la réponse
      res.status(200).json({
        profilePicture: uploadResult.secure_url,
        message: 'Photo de profil mise à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la photo de profil:', error);
      res.status(500).json({ 
        message: 'Erreur serveur lors de la mise à jour du profil', 
        error: error.message 
      });
    }
  });

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


router.post('/check-contacts', protect, checkContactsInApp);

// Nouvelle route pour télécharger les données de l'utilisateur
router.get('/download', protect, downloadUserData);

// Nouvelle route pour effacer les données de l'utilisateur
router.delete('/clear', protect, clearUserData);

// Nouvelle route pour supprimer le compte de l'utilisateur
router.delete('/delete', protect, deleteUserAccount);

// Nouvelle route pour récupérer les informations d'un utilisateur par ID
router.get('/:id', protect, getUserById);

module.exports = router;
