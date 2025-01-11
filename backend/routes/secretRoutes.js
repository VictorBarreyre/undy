const express = require('express');
const router = express.Router();
const { createSecret, getAllSecrets, purchaseSecret, getUserSecretsWithCount, getSecret } = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');

// Routes publiques
router.get('/', getAllSecrets); // Récupérer tous les secrets

// Routes privées
router.post('/createsecrets', protect, createSecret); // Créer un secret
router.post('/:id/purchase', protect, purchaseSecret); // Acheter un secret
router.get('/:id', protect, getSecret); // Voir un secret acheté

// Nouvelle route combinée pour récupérer les secrets de l'utilisateur et leur nombre
router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);

module.exports = router;
