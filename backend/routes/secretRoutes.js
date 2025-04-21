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
    checkIdentityVerificationStatus, 
    handleStripeReturn,
    verifyIdentity,
    updateBankAccount
} = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');
const Secret = require('../models/Secret');
const { moderationMiddleware } = require('../controllers/sighteningController');


// Routes publiques
router.get('/', getAllSecrets);

// Routes Stripe et paiements
router.post('/createsecrets', protect, moderationMiddleware, createSecret); // Ajout du middleware de modération
router.post('/:id/create-payment-intent', protect, createPaymentIntent);
router.post('/:id/confirm-payment', protect, confirmPayment);
router.post('/:id/purchase', protect, purchaseSecret);
router.post('/stripe/refresh-onboarding', protect, refreshStripeOnboarding);
router.post('/verify-identity', protect, verifyIdentity);
router.get('/check-identity-verification-status', protect, checkIdentityVerificationStatus); 
router.post('/stripe/update-bank-account', protect, updateBankAccount);
router.get('/stripe-return', protect, handleStripeReturn);


router.get('/stripe-refresh', protect, (req, res) => {
    res.status(200).json({
        message: 'Rafraîchissement Stripe réussi',
        status: 'success'
    });
});

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
router.post('/conversations/:conversationId/messages', protect, moderationMiddleware, addMessageToConversation); // Ajout du middleware de modération
router.delete('/conversations/:conversationId', protect, deleteConversation);
router.patch('/conversations/:conversationId/read', protect, markConversationAsRead);





module.exports = router;