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
    getConversation, 
    deleteConversation,
    createPaymentIntent,
    confirmPayment,
    refreshStripeOnboarding // Ajouter l'import
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
router.get('/stripe/refresh-onboarding', protect, refreshStripeOnboarding); // Nouvelle route

// Routes des secrets
router.get('/unpurchased', protect, getUnpurchasedSecrets);
router.get('/purchased', protect, getPurchasedSecrets);
router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);

// Routes des conversations
router.get('/conversations', protect, getUserConversations);
router.get('/conversations/secret/:secretId', protect, getSecretConversation);
router.post('/conversations/:conversationId/messages', protect, addMessageToConversation);
router.get('/conversations/:conversationId', protect, getConversation);
router.delete('/conversations/:conversationId', protect, deleteConversation);

module.exports = router;