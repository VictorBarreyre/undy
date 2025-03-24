const express = require('express');
const router = express.Router();
const { 
    createSecret, 
    getAllSecrets, 
    purchaseSecret, 
    getPurchasedSecrets,
    getUnpurchasedSecrets,
    getUserSecretsWithCount,
    getSecretConversation,
    addMessageToConversation,
    getUserConversations,
    deleteConversation,
    createPaymentIntent,
    confirmPayment,
    refreshStripeOnboarding,
    getSharedSecret,
    markConversationAsRead,
    uploadImage, 
    getNearbySecrets,
    deleteSecret,
    createIdentityVerification,
    checkIdentityVerificationStatus
} = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');
const Secret = require('../models/Secret');


// Routes publiques
router.get('/', getAllSecrets);

// Routes Stripe et paiements
router.post('/createsecrets', protect, createSecret);
router.post('/:id/create-payment-intent', protect, createPaymentIntent);
router.post('/:id/confirm-payment', protect, confirmPayment);
router.post('/:id/purchase', protect, purchaseSecret);
router.post('/stripe/refresh-onboarding', protect, refreshStripeOnboarding);
router.get('/stripe-return', protect, (req, res) => {
    res.status(200).json({
        message: 'Retour Stripe réussi',
        status: 'success'
    });
});
router.get('/stripe-refresh', protect, (req, res) => {
    res.status(200).json({
        message: 'Rafraîchissement Stripe réussi',
        status: 'success'
    });
});
router.post('/create-identity-verification', protect, createIdentityVerification);
router.get('/identity-verification-status', protect, checkIdentityVerificationStatus);




// Routes des secrets
router.get('/unpurchased', protect, getUnpurchasedSecrets);
router.get('/purchased', protect, getPurchasedSecrets);
router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);
router.get('/shared/:secretId', protect, getSharedSecret);
router.get('/nearby', protect, getNearbySecrets);
router.delete('/:id', protect, deleteSecret); 




// Routes des conversations
router.get('/conversations', protect, getUserConversations);
router.get('/conversations/secret/:secretId', protect, getSecretConversation);
router.post('/conversations/:conversationId/messages', protect, addMessageToConversation);
router.delete('/conversations/:conversationId', protect, deleteConversation);
router.patch('/conversations/:conversationId/read', protect, markConversationAsRead);
router.post('/upload-image', protect, uploadImage);




module.exports = router;