const express = require('express');
const router = express.Router();
const { 
    createSecret, 
    getAllSecrets, 
    purchaseSecret, 
    getPurchasedSecrets,
    getUserSecretsWithCount,
    getSecretConversation,
    addMessageToConversation,
    getUserConversations,
    getConversation, 
    deleteConversation,
    createPaymentIntent,
    confirmPayment
} = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');
const Secret = require('../models/Secret');


// Routes publiques
router.get('/', getAllSecrets); // Récupérer tous les secrets

// Routes privées
router.post('/createsecrets', protect, createSecret); // Créer un secret

router.post('/:id/purchase', protect, purchaseSecret); // Acheter un secret

router.get('/purchased', protect, getPurchasedSecrets);

router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);

router.get('/conversations', protect, getUserConversations); // Obtenir toutes les conversations de l'utilisateur

router.get('/conversations/secret/:secretId', protect, getSecretConversation); // Obtenir la conversation d'un secret spécifique

router.post('/conversations/:conversationId/messages', protect, addMessageToConversation); // Ajouter un message à une conversation

router.get('/conversations/:conversationId', protect, getConversation); // Nouvelle route

router.delete('/conversations/:conversationId', protect, deleteConversation);

router.post('/:id/create-payment-intent', protect, createPaymentIntent);

router.post('/:id/confirm-payment', protect, confirmPayment);


module.exports = router;
