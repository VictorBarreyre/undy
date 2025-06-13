const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const protect  = require('../middleware/authMiddleware');

// Vérification de débogage pour voir si les fonctions sont correctement importées
console.log("Fonctions disponibles dans le contrôleur:", Object.keys(notificationsController));

// Route pour enregistrer le token de l'appareil
router.post('/register', protect, notificationsController.registerToken);

// Route pour les notifications d'achat
router.post('/purchase', protect, notificationsController.sendPurchaseNotification);

// Route pour les notifications de nouveaux messages
router.post('/message', protect, notificationsController.sendMessageNotification);

// Route pour les rappels Stripe
router.post('/stripe-reminder', protect, notificationsController.sendStripeReminderNotification);

// Route pour les tests de notification
router.post('/test', protect, notificationsController.sendTestNotification);

router.post('/cleanup-simulator', protect, notificationsController.cleanupSimulatorTokens);


module.exports = router;