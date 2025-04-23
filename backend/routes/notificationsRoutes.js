const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const auth = require('../middleware/auth');

// Route pour enregistrer le token de l'appareil
router.post('/token', auth, notificationsController.registerToken);

// Route pour les notifications d'achat
router.post('/purchase', auth, notificationsController.sendPurchaseNotification);

// Route pour les notifications de nouveaux messages
router.post('/message', auth, notificationsController.sendMessageNotification);

// Route pour les notifications de secrets à proximité
router.post('/nearby', auth, notificationsController.sendNearbyNotification);

// Route pour les rappels Stripe
router.post('/stripe-reminder', auth, notificationsController.sendStripeReminderNotification);

// Route pour les notifications d'événements limités dans le temps
router.post('/event', auth, notificationsController.sendEventNotification);

// Route pour les notifications statistiques
router.post('/stats', auth, notificationsController.sendStatsNotification);

// Route pour les notifications de bienvenue
router.post('/welcome-back', auth, notificationsController.sendWelcomeBackNotification);

module.exports = router;