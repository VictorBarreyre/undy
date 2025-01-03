const express = require('express');
const router = express.Router();
const { createSecret, getAllSecrets, purchaseSecret, getSecret } = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');


// Routes publiques
router.get('/', getAllSecrets); // Récupérer tous les secrets

// Routes privées
router.post('/createsecrets', protect, createSecret); // Créer un secret
router.post('/:id/purchase', protect, purchaseSecret); // Acheter un secret
router.get('/:id', protect, getSecret); // Voir un secret acheté

module.exports = router;
