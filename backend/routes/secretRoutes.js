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
    getNearbySecrets,
    deleteSecret,
    checkIdentityVerificationStatus, 
    handleStripeReturn,
    verifyIdentity,
    updateBankAccount,
    getConversationMessages,
    getConversation
} = require('../controllers/secretController');
const protect = require('../middleware/authMiddleware');
const { moderationMiddleware } = require('../controllers/moderationController');

// 1. Routes statiques D'ABORD
router.get('/', getAllSecrets);
router.post('/createsecrets', protect, moderationMiddleware, createSecret);
router.get('/unpurchased', protect, getUnpurchasedSecrets);
router.get('/purchased', protect, getPurchasedSecrets);
router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);
router.get('/nearby', protect, getNearbySecrets);
router.get('/conversations', protect, getUserConversations);

// 2. Routes Stripe
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

// 3. Routes de conversations avec IDs statiques
router.get('/conversations/secret/:secretId', protect, getSecretConversation);
router.get('/conversations/:conversationId', protect, getConversation);
router.get('/conversations/:conversationId/messages', protect, getConversationMessages);
router.post('/conversations/:conversationId/messages', protect, moderationMiddleware, addMessageToConversation);
router.delete('/conversations/:conversationId', protect, deleteConversation);
router.patch('/conversations/:conversationId/read', protect, markConversationAsRead);

// 4. Routes avec :id DYNAMIQUE EN DERNIER
router.get('/shared/:secretId', protect, getSharedSecret);
router.post('/:id/create-payment-intent', protect, createPaymentIntent);
router.post('/:id/confirm-payment', protect, confirmPayment);
router.post('/:id/purchase', protect, purchaseSecret);
router.delete('/:id', protect, deleteSecret);

module.exports = router;