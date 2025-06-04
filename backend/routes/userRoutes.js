// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// Middleware
const protect = require('../middleware/authMiddleware');

// Controllers
const { 
    appleLogin,
    handleAppleNotifications,
    registerUser,
    loginUser,
    googleLogin,
    refreshToken,
    updateUserProfile,
    getUserProfile,
    downloadUserData,
    getUserTransactions,
    createTransferIntent,
    getPayoutHistory,
    clearUserData,
    deleteUserAccount,
    checkContactsInApp,
    getBankAccountDetails,
    updateLanguage,
    getUserById 
} = require('../controllers/userController');

const { uploadImage } = require('../controllers/uploadController');

// Models et configs
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// Routes publiques (authentification)
router.post('/apple-login', appleLogin);
router.post('/apple-notifications', handleAppleNotifications);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);
router.post('/refresh-token', refreshToken);

// Routes protégées (nécessitent authentification)
// Profil utilisateur
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.patch('/language', protect, updateLanguage);

// Photo de profil
router.post('/profile-picture', protect, async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ message: 'Aucune image fournie' });
        }
        
        // Options pour Cloudinary
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

// Transactions et paiements
router.get('/bank-account-details', protect, getBankAccountDetails);
router.get('/transactions', protect, getUserTransactions);
router.get('/payout-history', protect, getPayoutHistory);
router.post('/create-transfer-intent', protect, createTransferIntent);

// Gestion des contacts
router.post('/check-contacts', protect, checkContactsInApp);

// Gestion des données utilisateur
router.get('/download', protect, downloadUserData);
router.delete('/clear', protect, clearUserData);
router.delete('/delete', protect, deleteUserAccount);

// Route avec paramètre (doit être à la fin)
router.get('/:id', protect, getUserById);

module.exports = router;