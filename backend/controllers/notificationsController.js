const User = require('../models/User');
const Secret = require('../models/Secret');
const { Expo } = require('expo-server-sdk');
const fs = require('fs');

// Récupérer les variables d'environnement pour le certificat
const certBase64 = process.env.PUSH_CERTIFICATE;
const certPassword = process.env.PUSH_CERTIFICATE_PASS;

// Configurer l'instance Expo avec le certificat APN si disponible
let expo;
if (certBase64 && certPassword) {
  console.log('Configuration d\'Expo avec le certificat APN');
  const certBuffer = Buffer.from(certBase64, 'base64');
  
  expo = new Expo({
    usePushNotificationServices: true,
    apns: {
      production: process.env.NODE_ENV === 'production',
      cert: certBuffer,
      passphrase: certPassword
    }
  });
} else {
  console.log('Configuration d\'Expo sans certificat APN (notifications limitées)');
  expo = new Expo();
}


// Service pour l'envoi des notifications
const sendPushNotifications = async (userIds, title, body, data = {}) => {
  try {
    // Récupérer les tokens des utilisateurs
    const users = await User.find({ _id: { $in: userIds } });
    
    // Préparer les messages pour chaque utilisateur
    const messages = [];
    
    for (const user of users) {
      if (!user.expoPushToken) continue;
      
      // Vérifier que le token est valide
      if (!Expo.isExpoPushToken(user.expoPushToken)) {
        console.log(`Token invalide pour l'utilisateur ${user._id}`);
        continue;
      }
      
      // Ajouter le message à la liste
      messages.push({
        to: user.expoPushToken,
        sound: 'default',
        title,
        body,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        badge: 1,
        channelId: 'default', // Pour Android
      });
    }
    
    // Si aucun message valide, sortir
    if (messages.length === 0) {
      console.log('Aucun message valide à envoyer');
      return { success: false, message: 'Aucun destinataire valide' };
    }
    
    // Diviser les notifications en chunks (max 100 par chunk)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    // Envoyer chaque chunk
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('Notifications envoyées:', ticketChunk);
      } catch (error) {
        console.error('Erreur lors de l\'envoi des notifications:', error);
      }
    }
    
    return { success: true, tickets };
  } catch (error) {
    console.error('Erreur globale lors de l\'envoi des notifications:', error);
    return { success: false, error: error.message };
  }
};

// Contrôleur pour les notifications
const notificationsController = {
  // Enregistrer le token de l'appareil
  registerToken: async (req, res) => {
    try {
      const { expoPushToken } = req.body;
      const userId = req.user._id;
      
      // Valider le token
      if (!Expo.isExpoPushToken(expoPushToken)) {
        return res.status(400).json({
          success: false,
          message: 'Token push invalide'
        });
      }
      
      // Mettre à jour le token dans la base de données
      await User.findByIdAndUpdate(userId, { expoPushToken });
      
      res.status(200).json({
        success: true,
        message: 'Token enregistré avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },
  
  // Notification d'achat de secret
  sendPurchaseNotification: async (req, res) => {
    try {
      const { secretId, buyerId, buyerName, price, currency } = req.body;
      
      // Vérifier les paramètres requis
      if (!secretId || !buyerId) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres manquants'
        });
      }
      
      // Récupérer les informations du secret
      const secret = await Secret.findById(secretId).populate('seller', '_id name');
      
      if (!secret) {
        return res.status(404).json({
          success: false,
          message: 'Secret non trouvé'
        });
      }
      
      // Ne pas notifier si l'acheteur est aussi le vendeur
      if (buyerId === secret.seller._id.toString()) {
        return res.status(200).json({
          success: true,
          message: 'Pas de notification, acheteur = vendeur'
        });
      }
      
      // Formater le prix
      const formattedPrice = `${price} ${currency}`;
      
      // Envoyer la notification au vendeur seulement
      const notificationResult = await sendPushNotifications(
        [secret.seller._id.toString()],
        'Secret vendu!',
        `${buyerName} a acheté votre secret pour ${formattedPrice}`,
        {
          type: 'purchase',
          secretId,
          buyerId,
          price,
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Notification d\'achat envoyée',
        details: notificationResult
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification d\'achat:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },
  
  // Notification de nouveau message
  sendMessageNotification: async (req, res) => {
    try {
      const { conversationId, senderId, senderName, messagePreview } = req.body;
      
      // Vérifier les paramètres requis
      if (!conversationId || !senderId) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres manquants'
        });
      }
      
      // Récupérer les participants de la conversation
      const conversation = await Conversation.findById(conversationId)
        .populate('participants', '_id name');
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation non trouvée'
        });
      }
      
      // Filtrer les participants pour exclure l'expéditeur
      const recipientIds = conversation.participants
        .filter(p => p._id.toString() !== senderId)
        .map(p => p._id.toString());
      
      if (recipientIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Aucun destinataire à notifier'
        });
      }
      
      // Tronquer le message s'il est trop long
      const truncatedMessage = messagePreview.length > 100 
        ? messagePreview.substring(0, 97) + '...' 
        : messagePreview;
      
      // Envoyer la notification aux autres participants
      const notificationResult = await sendPushNotifications(
        recipientIds,
        `Message de ${senderName}`,
        truncatedMessage,
        {
          type: 'new_message',
          conversationId,
          senderId,
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Notification de message envoyée',
        details: notificationResult
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de message:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },
  
  // Notification de secrets à proximité
  sendNearbyNotification: async (req, res) => {
    try {
      const { userId, count, distance } = req.body;
      
      // Vérifier les paramètres requis
      if (!userId || !count || !distance) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres manquants'
        });
      }
      
      // Envoyer la notification
      const notificationResult = await sendPushNotifications(
        [userId],
        'Secrets à proximité',
        `${count} secrets sont disponibles à moins de ${distance}km de vous`,
        {
          type: 'nearby_secrets',
          count,
          distance,
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Notification de proximité envoyée',
        details: notificationResult
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de proximité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },
  
  // Notification de rappel Stripe
  sendStripeReminderNotification: async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Vérifier le paramètre requis
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur manquant'
        });
      }
      
      // Envoyer la notification
      const notificationResult = await sendPushNotifications(
        [userId],
        'Configuration Stripe incomplète',
        'Finalisez votre configuration pour recevoir vos paiements',
        {
          type: 'stripe_setup_reminder',
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Notification de rappel Stripe envoyée',
        details: notificationResult
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de rappel Stripe:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },
  
  // Autres méthodes du contrôleur pour les différents types de notifications...
  sendEventNotification: async (req, res) => {
    // Implémentation similaire pour les notifications d'événements
  },
  
  sendStatsNotification: async (req, res) => {
    // Implémentation pour les notifications de statistiques
  },
  
  sendWelcomeBackNotification: async (req, res) => {
    // Implémentation pour les notifications de bienvenue
  }
};

module.exports = notificationsController;