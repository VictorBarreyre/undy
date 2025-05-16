const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const protect  = require('../middleware/authMiddleware');

// Vérification de débogage pour voir si les fonctions sont correctement importées
console.log("Fonctions disponibles dans le contrôleur:", Object.keys(notificationsController));

// Route pour enregistrer le token de l'appareil
router.post('/token', protect, notificationsController.registerToken);

// Route pour les notifications d'achat
router.post('/purchase', protect, notificationsController.sendPurchaseNotification);

// Route pour les notifications de nouveaux messages
router.post('/message', protect, notificationsController.sendMessageNotification);

// Route pour les notifications de secrets à proximité
router.post('/nearby', protect, notificationsController.sendNearbyNotification);

// Route pour les rappels Stripe
router.post('/stripe-reminder', protect, notificationsController.sendStripeReminderNotification);

// Route pour les notifications d'événements limités dans le temps
router.post('/event', protect, notificationsController.sendEventNotification);

// Route pour les notifications statistiques
router.post('/stats', protect, notificationsController.sendStatsNotification);

// Route pour les notifications de bienvenue
router.post('/welcome-back', protect, notificationsController.sendWelcomeBackNotification);

// Route pour les tests de notification
router.post('/test', protect, notificationsController.sendTestNotification);

module.exports = router;