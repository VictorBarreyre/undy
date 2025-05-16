const User = require('../models/User');
const Secret = require('../models/Secret');
const Conversation = require('../models/Conversation'); // Assurez-vous d'ajouter cette importation
const apn = require('node-apn'); // Ajoutez cette dépendance (npm install node-apn)
const fs = require('fs');

// Récupérer les variables d'environnement pour le certificat (code existant)
const certBase64 = process.env.PUSH_CERTIFICATE;
const certPassword = process.env.PUSH_CERTIFICATE_PASS;

// Configurer le provider APNs avec le certificat
let apnProvider;
if (certBase64 && certPassword) {
  console.log('Configuration des notifications avec certificat APNs');
  try {
    const certBuffer = Buffer.from(certBase64, 'base64');
    
    apnProvider = new apn.Provider({
      pfx: certBuffer,
      passphrase: certPassword,
      production: process.env.NODE_ENV === 'production', // Environnement de développement ou production
    });
    
    console.log('Provider APNs configuré avec succès');
  } catch (error) {
    console.error('Erreur lors de la configuration du provider APNs:', error);
  }
} else {
  console.log('Certificat APNs manquant, les notifications push ne fonctionneront pas');
}

// Fonction d'envoi de notification modifiée pour utiliser APNs directement
const sendPushNotifications = async (userIds, title, body, data = {}) => {
  try {
    // Si APNs n'est pas configuré, sortir
    if (!apnProvider) {
      return { success: false, message: 'Provider APNs non configuré' };
    }
    
    // Récupérer les tokens des utilisateurs
    const users = await User.find({ _id: { $in: userIds } });
    
    // Préparation des résultats
    const results = { sent: [], failed: [] };
    
    // Pour chaque utilisateur
    for (const user of users) {
      if (!user.expoPushToken) continue;
      
      // Déterminer le type de token
      let isExpoToken = user.expoPushToken.startsWith('ExponentPushToken[');
      
      // Si c'est un token Expo, on peut le logger mais on ne peut pas l'utiliser directement
      if (isExpoToken) {
        console.log(`Token Expo détecté pour l'utilisateur ${user._id}, non supporté sans EAS`);
        results.failed.push({
          userId: user._id,
          reason: 'Token Expo détecté, EAS requis'
        });
        continue;
      }
      
      // Créer la notification APNs
      const notification = new apn.Notification();
      notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expire dans 1h
      notification.badge = 1;
      notification.sound = 'default';
      notification.alert = {
        title: title,
        body: body,
      };
      notification.payload = {
        ...data,
        timestamp: new Date().toISOString()
      };
      notification.topic = 'com.hushy.app'; // Votre bundle ID
      
      try {
        // Envoyer la notification
        const response = await apnProvider.send(notification, user.expoPushToken);
        
        // Vérifier le résultat
        if (response.failed.length > 0) {
          results.failed.push({
            userId: user._id,
            token: user.expoPushToken,
            reason: response.failed[0].response
          });
        } else {
          results.sent.push({
            userId: user._id,
            token: user.expoPushToken
          });
        }
      } catch (error) {
        results.failed.push({
          userId: user._id,
          token: user.expoPushToken,
          reason: error.message
        });
      }
    }
    
    return { 
      success: results.sent.length > 0, 
      results 
    };
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

 sendTestNotification : async (req, res) => {
    try {
      const userId = req.user._id;
      const { token } = req.body; // Optionnel: pour tester avec un token spécifique
      
      console.log('Envoi d\'une notification de test à l\'utilisateur:', userId);
      
      // Si un token spécifique est fourni, l'utiliser directement
      if (token) {
        console.log('Utilisation du token spécifié:', token);
        
        // Traiter le cas du token simulateur
        if (token === "SIMULATOR_MOCK_TOKEN") {
          console.log('Token simulateur détecté, envoi d\'une réponse simulée');
          return res.status(200).json({
            success: true,
            message: 'Simulation d\'envoi réussie pour le token de simulateur',
            simulated: true
          });
        }
        
        // Créer un message test
        const notification = new apn.Notification();
        notification.expiry = Math.floor(Date.now() / 1000) + 3600;
        notification.badge = 1;
        notification.sound = 'default';
        notification.alert = {
          title: '⚠️ Test de notification',
          body: 'Cette notification de test a été envoyée depuis le serveur!',
        };
        notification.payload = { 
          type: 'test',
          timestamp: new Date().toISOString()
        };
        notification.topic = 'com.hushy.app'; // Votre bundle ID
        
        // Envoyer la notification directement
        const result = await apnProvider.send(notification, token);
        
        return res.status(200).json({
          success: result.sent.length > 0,
          message: 'Notification de test envoyée directement',
          result
        });
      }
      
      // Sinon, utiliser le service normal pour envoyer à l'utilisateur
      const notificationResult = await sendPushNotifications(
        [userId],
        '⚠️ Test de notification',
        'Cette notification de test a été envoyée depuis le serveur!',
        {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Notification de test envoyée',
        details: notificationResult
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de test:', error);
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