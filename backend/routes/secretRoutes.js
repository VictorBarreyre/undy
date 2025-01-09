const express = require('express');
const router = express.Router();
const { createSecret, getAllSecrets, purchaseSecret, getSecret, getSecretsCountByUser } = require('../controllers/secretController');
const protect  = require('../middleware/authMiddleware');
const Secret = require('../models/Secret');


// Routes publiques
router.get('/', getAllSecrets); // Récupérer tous les secrets

// Routes privées
router.post('/createsecrets', protect, createSecret); // Créer un secret
router.post('/:id/purchase', protect, purchaseSecret); // Acheter un secret
router.get('/:id', protect, getSecret); // Voir un secret acheté

router.get('/user-secrets', protect, async (req, res) => {
    try {
        const secrets = await Secret.find({ user: req.user.id });
        res.status(200).json({ secrets });
    } catch (error) {
        console.error('Erreur lors de la récupération des secrets :', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

router.get('/count', protect, getSecretsCountByUser);



module.exports = router;
