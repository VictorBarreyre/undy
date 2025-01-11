const express = require('express');
const router = express.Router();
const { createSecret, getAllSecrets, purchaseSecret, getUserSecretsWithCount } = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');
const Secret = require('../models/Secret');


// Routes publiques
router.get('/', getAllSecrets); // Récupérer tous les secrets

// Routes privées
router.post('/createsecrets', protect, createSecret); // Créer un secret
router.post('/:id/purchase', protect, purchaseSecret); // Acheter un secret

router.get('/user-secrets-with-count', protect, getUserSecretsWithCount);




module.exports = router;
