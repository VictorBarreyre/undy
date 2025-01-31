const express = require('express');
const router = express.Router();
const { 
    createSecret, 
    getAllSecrets, 
    purchaseSecret, 
    getUserSecretsWithCount,
    getSecretConversation,
    addMessageToConversation,
    getUserConversations,
    getConversation, 
    deleteConversation
} = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');
const Secret = require('../models/Secret');


// Routes publiques
router.get('/', getAllSecrets); // Récupérer tous les secrets

// Routes privées
router.post('/createsecrets', protect, createSecret); // Créer un secret

router.post('/:id/purchase', protect, purchaseSecret); // Acheter un secret

router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);

router.get('/conversations', protect, getUserConversations); // Obtenir toutes les conversations de l'utilisateur

router.get('/conversations/secret/:secretId', protect, getSecretConversation); // Obtenir la conversation d'un secret spécifique

router.post('/conversations/:conversationId/messages', protect, addMessageToConversation); // Ajouter un message à une conversation

router.get('/conversations/:conversationId', protect, getConversation); // Nouvelle route

router.delete('/conversations/:conversationId', protect, deleteConversation);


module.exports = router;
