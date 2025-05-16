const User = require('../models/User');
const Secret = require('../models/Secret');
const Conversation = require('../models/Conversation');
const apn = require('node-apn');
const fs = require('fs');

// Récupérer les variables d'environnement pour le certificat
const certBase64 = process.env.PUSH_CERTIFICATE;
const certPassword = process.env.PUSH_CERTIFICATE_PASS;

// Configurer le provider APNs avec le certificat
let apnProvider;
if (certBase64 && certPassword) {
  console.log('Configuration des notifications avec certificat APNs');
  try {
    const certBuffer = Buffer.from(certBase64, 'base64');
    
    // Options de configuration améliorées pour le débogage
    apnProvider = new apn.Provider({
      pfx: certBuffer,
      passphrase: certPassword,
      production: false,
      port: 443,
      rejectUnauthorized: true,
      connectionRetryLimit: 5,
      logLevel: "debug",
      // Options supplémentaires pour le débogage
      enhanced: true, // Utilisez le mode amélioré
      proxy: null, // Pas de proxy
      timeout: 5000, // Timeout de 5 secondes
      address: 'api.sandbox.push.apple.com',
      connectTimeout: 10000 // Timeout de connexion plus long
    });
    
    console.log('Provider APNs configuré avec succès');
  } catch (error) {
    console.error('Erreur lors de la configuration du provider APNs:', error);
  }
} else {
  console.log('Certificat APNs manquant, les notifications push ne fonctionneront pas');
}

// Fonction d'envoi de notification modifiée avec plus de logs
const sendPushNotifications = async (userIds, title, body, data = {}) => {
  try {
    console.log('Début de sendPushNotifications avec userIds:', userIds);
    
    // Si APNs n'est pas configuré, sortir
    if (!apnProvider) {
      console.log('Provider APNs non configuré, impossible d\'envoyer des notifications');
      return { success: false, message: 'Provider APNs non configuré' };
    }
    
    // Récupérer les tokens des utilisateurs
    const users = await User.find({ _id: { $in: userIds } });
    console.log(`Nombre d'utilisateurs trouvés: ${users.length}`);
    
    // Préparation des résultats
    const results = { sent: [], failed: [] };
    
    // Pour chaque utilisateur
    for (const user of users) {
      console.log(`Traitement de l'utilisateur ${user._id}, token: ${user.expoPushToken || 'non défini'}`);
      
      if (!user.expoPushToken) {
        console.log(`Pas de token pour l'utilisateur ${user._id}, on passe au suivant`);
        continue;
      }
      
      // Déterminer le type de token
      let isExpoToken = user.expoPushToken.startsWith('ExponentPushToken[');
      console.log(`Token type: ${isExpoToken ? 'Expo' : 'APNs'}`);
      
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
      
      console.log('Notification préparée:', JSON.stringify({
        expiry: notification.expiry,
        badge: notification.badge,
        sound: notification.sound,
        alert: notification.alert,
        topic: notification.topic
      }));
      
      try {
        console.log(`Envoi de la notification à ${user.expoPushToken}`);
        
        // Envoyer la notification
        const response = await apnProvider.send(notification, user.expoPushToken);
        console.log('Réponse complète APNs:', JSON.stringify(response, null, 2));
        
        // Vérifier le résultat
        if (response.failed && response.failed.length > 0) {
          console.log('Échec de l\'envoi:', JSON.stringify(response.failed[0], null, 2));
          results.failed.push({
            userId: user._id,
            token: user.expoPushToken,
            reason: response.failed[0].response || response.failed[0].error || 'Raison inconnue'
          });
        } else if (response.sent && response.sent.length > 0) {
          console.log('Notification envoyée avec succès');
          results.sent.push({
            userId: user._id,
            token: user.expoPushToken
          });
        } else {
          console.log('Résultat indéterminé:', JSON.stringify(response, null, 2));
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
        results.failed.push({
          userId: user._id,
          token: user.expoPushToken,
          reason: error.message
        });
      }
    }
    
    console.log('Résultats finaux:', JSON.stringify(results, null, 2));
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
const registerToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const userId = req.user._id;
    
    console.log(`Tentative d'enregistrement du token ${expoPushToken} pour l'utilisateur ${userId}`);
    
    // Valider le token (modification pour accepter les tokens APNs)
    const isValidToken = expoPushToken && 
      (expoPushToken.startsWith('ExponentPushToken[') || // Token Expo
        expoPushToken.match(/^[a-f0-9]{64}$/i) || // Token APNs (hexadécimal 64 caractères)
        expoPushToken === "SIMULATOR_MOCK_TOKEN"); // Token de simulateur
    
    if (!isValidToken) {
      console.log('Token invalide:', expoPushToken);
      return res.status(400).json({
        success: false,
        message: 'Token push invalide'
      });
    }
    
    // Mettre à jour le token dans la base de données
    await User.findByIdAndUpdate(userId, { expoPushToken });
    console.log(`Token enregistré avec succès pour l'utilisateur ${userId}`);
    
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
};

// Test de notification
const sendTestNotification = async (req, res) => {
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
      
      console.log('Notification préparée pour test direct, topic:', notification.topic);
      
      // Envoyer la notification directement avec plus de logs
      console.log('Envoi de la notification au token:', token);
      const result = await apnProvider.send(notification, token);
      console.log('Résultat complet APNs (test direct):', JSON.stringify(result, null, 2));
      
      // Vérifier si l'envoi a réussi
      let hasSucceeded = false;
      let detailedError = {};
      
      if (result.sent && result.sent.length > 0) {
        hasSucceeded = true;
      } else if (result.failed && result.failed.length > 0) {
        // Capturer les détails de l'erreur pour le diagnostic
        detailedError = {
          status: result.failed[0].status,
          response: result.failed[0].response,
          error: result.failed[0].error
        };
      }
      
      return res.status(200).json({
        success: hasSucceeded,
        message: hasSucceeded ? 'Notification de test envoyée directement' : 'Échec de l\'envoi de la notification',
        result: result,
        error: hasSucceeded ? undefined : detailedError
      });
    }
    
    // Sinon, utiliser le service normal pour envoyer à l'utilisateur
    console.log('Envoi de notification via le service normal pour l\'utilisateur:', userId);
    const notificationResult = await sendPushNotifications(
      [userId],
      '⚠️ Test de notification',
      'Cette notification de test a été envoyée depuis le serveur!',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );
    
    console.log('Résultat du service normal:', JSON.stringify(notificationResult, null, 2));
    res.status(200).json({
      success: true,
      message: 'Notification de test envoyée',
      details: notificationResult
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de test:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Notification de nouveau message
const sendMessageNotification = async (req, res) => {
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
};

// Notification d'achat de secret
const sendPurchaseNotification = async (req, res) => {
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
};

// Notification de secrets à proximité
const sendNearbyNotification = async (req, res) => {
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
};

// Notification de rappel Stripe
const sendStripeReminderNotification = async (req, res) => {
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
};

// Notification d'événement (implémentation complète)
const sendEventNotification = async (req, res) => {
  try {
    const { userId, eventName, daysLeft } = req.body;
    
    // Vérifier les paramètres requis
    if (!userId || !eventName) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants'
      });
    }
    
    // Envoyer la notification
    const notificationResult = await sendPushNotifications(
      [userId],
      'Événement à venir',
      `${eventName} se termine dans ${daysLeft} jours`,
      {
        type: 'time_limited_event',
        eventName,
        daysLeft,
        timestamp: new Date().toISOString()
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Notification d\'événement envoyée',
      details: notificationResult
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification d\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Notification de statistiques (implémentation complète)
const sendStatsNotification = async (req, res) => {
  try {
    const { userId, secretsCount, purchasesCount } = req.body;
    
    // Vérifier les paramètres requis
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur manquant'
      });
    }
    
    // Envoyer la notification
    const notificationResult = await sendPushNotifications(
      [userId],
      'Statistiques de la semaine',
      `${secretsCount} nouveaux secrets et ${purchasesCount} ventes cette semaine`,
      {
        type: 'stats_update',
        secretsCount,
        purchasesCount,
        timestamp: new Date().toISOString()
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Notification de statistiques envoyée',
      details: notificationResult
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Notification de bienvenue (implémentation complète)
const sendWelcomeBackNotification = async (req, res) => {
  try {
    const { userId, daysAbsent } = req.body;
    
    // Vérifier les paramètres requis
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur manquant'
      });
    }
    
    // Envoyer la notification
    const notificationResult = await sendPushNotifications(
      [userId],
      'Bon retour parmi nous!',
      `Vous nous avez manqué pendant ${daysAbsent} jours. Découvrez les nouveaux secrets!`,
      {
        type: 'welcome_back',
        daysAbsent,
        timestamp: new Date().toISOString()
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Notification de bienvenue envoyée',
      details: notificationResult
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de bienvenue:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Export du contrôleur
module.exports = {
  registerToken,
  sendTestNotification,
  sendMessageNotification,
  sendPurchaseNotification,
  sendNearbyNotification,
  sendStripeReminderNotification,
  sendEventNotification,
  sendStatsNotification, 
  sendWelcomeBackNotification
};