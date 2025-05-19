const User = require('../models/User');
const Secret = require('../models/Secret');
const Conversation = require('../models/Conversation');
const apn = require('node-apn');
const fs = require('fs');

const apnsKeyId = process.env.APNS_KEY_ID;
const apnsTeamId = process.env.APPLE_TEAM_ID;
const apnsKey = process.env.APNS_KEY;
// Détection de l'environnement via variable d'environnement (par défaut: sandbox/développement)
const apnsProduction = process.env.APNS_PRODUCTION === 'true';
// Bundle ID de l'application
const bundleId = process.env.APP_BUNDLE_ID || 'com.hushy.app';

// Logs de débogage pour les variables d'environnement
console.log("======== INFORMATIONS DE CONFIGURATION APNS ========");
console.log("APNS_KEY_ID:", apnsKeyId ? "✅ Présent" : "❌ Manquant");
console.log("APPLE_TEAM_ID:", apnsTeamId ? "✅ Présent" : "❌ Manquant");
console.log("APNS_KEY:", apnsKey ? "✅ Présent" : "❌ Manquant");
console.log("Environnement:", apnsProduction ? "🚀 PRODUCTION" : "🧪 SANDBOX (développement)");
console.log("Bundle ID:", bundleId);

// Configuration du provider APNs
let apnProvider = null;

// Initialisation avec JWT uniquement
if (apnsKeyId && apnsTeamId && apnsKey) {
  console.log("Configuration JWT avec clé encodée en Base64...");
  
  try {
    // Décoder la clé Base64
    const keyBuffer = Buffer.from(apnsKey, 'base64').toString('utf8');
    
    // Configuration du provider avec l'environnement approprié
    apnProvider = new apn.Provider({
      token: {
        key: keyBuffer,
        keyId: apnsKeyId,
        teamId: apnsTeamId
      },
      production: apnsProduction,
      // Gateway explicite pour plus de clarté
      gateway: apnsProduction ? 'api.push.apple.com' : 'api.sandbox.push.apple.com'
    });
    
    console.log(`Provider APNs configuré avec succès (JWT) pour l'environnement ${apnsProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    
    // Ajouter un écouteur d'erreurs globales
    apnProvider.on('error', (err) => {
      console.error("Erreur APNs globale:", err);
    });
  } catch (error) {
    console.error("Erreur lors de la configuration JWT:", error.message);
    apnProvider = null;
  }
} else {
  console.error("ÉCHEC DE L'INITIALISATION DU PROVIDER APNS: Variables JWT manquantes");
  console.error("Les notifications push ne fonctionneront pas.");
  console.error("Veuillez configurer APNS_KEY_ID, APPLE_TEAM_ID et APNS_KEY");
}

console.log("======== FIN INFORMATIONS DE CONFIGURATION APNS ========");


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

// Fonction sendTestNotification avec logs détaillés et accès correct aux variables
const sendTestNotification = async (req, res) => {
  console.log('=== DÉBUT DE LA FONCTION sendTestNotification ===');
  
  try {
    const userId = req.user._id;
    const { token } = req.body; // Optionnel: pour tester avec un token spécifique
    
    console.log(`[TEST_NOTIF] Utilisateur: ${userId}`);
    console.log(`[TEST_NOTIF] Token fourni: ${token || 'aucun'}`);
    
    // Vérification de la configuration - accès aux variables externes
    console.log('[TEST_NOTIF] Vérification de la configuration APNs:');
    console.log({
      certificatExiste: typeof certBase64 !== 'undefined' && !!certBase64,
      motDePasseExiste: typeof certPassword !== 'undefined' && !!certPassword,
      production: true, // Vérifiez que cette valeur est bien à true pour un certificat de production
      bundleId: 'com.hushy.app',
      providerInitialisé: !!apnProvider
    });
    
    // Vérification du provider
    if (!apnProvider) {
      console.error('[TEST_NOTIF] ERREUR: Le provider APNs n\'est pas initialisé');
      return res.status(500).json({
        success: false,
        message: 'Provider APNs non initialisé',
        error: 'PROVIDER_NOT_INITIALIZED'
      });
    }
    
    console.log('[TEST_NOTIF] Provider APNs initialisé correctement');
    
    // Ajouter des gestionnaires d'événements temporaires pour ce test
    const errorHandler = (err) => {
      console.error('[TEST_NOTIF] Événement d\'erreur APNs:', err);
    };
    
    const transmittedHandler = (notification, device) => {
      console.log(`[TEST_NOTIF] Notification transmise à l'appareil: ${device}`);
    };
    
    const completeHandler = () => {
      console.log(`[TEST_NOTIF] Tous les messages ont été transmis ou ont échoué`);
    };
    
    // Enregistrer les gestionnaires d'événements
    apnProvider.on('error', errorHandler);
    apnProvider.on('transmitted', transmittedHandler);
    apnProvider.on('completed', completeHandler);
    
    // Si un token spécifique est fourni, l'utiliser directement
    if (token) {
      console.log(`[TEST_NOTIF] Utilisation du token spécifié: ${token}`);
      
      // Traiter le cas du token simulateur
      if (token === "SIMULATOR_MOCK_TOKEN") {
        console.log('[TEST_NOTIF] Token simulateur détecté, envoi d\'une réponse simulée');
        
        // Nettoyage des gestionnaires d'événements
        apnProvider.removeListener('error', errorHandler);
        apnProvider.removeListener('transmitted', transmittedHandler);
        apnProvider.removeListener('completed', completeHandler);
        
        return res.status(200).json({
          success: true,
          message: 'Simulation d\'envoi réussie pour le token de simulateur',
          simulated: true
        });
      }
      
      // Vérifier le format du token
      const isValidApnsToken = token && token.match(/^[a-f0-9]{64}$/i);
      if (!isValidApnsToken) {
        console.log(`[TEST_NOTIF] AVERTISSEMENT: Le token ne semble pas être un token APNs valide: ${token}`);
      } else {
        console.log('[TEST_NOTIF] Le token a un format APNs valide');
      }
      
      // Créer trois variantes de notifications pour tester
      console.log('[TEST_NOTIF] Préparation de plusieurs formats de notifications pour test');
      
      // 1. Notification complète
      const notification1 = new apn.Notification();
      notification1.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 heure
      notification1.badge = 1;
      notification1.sound = 'default';
      notification1.alert = {
        title: '⚠️ Test de notification 1',
        body: 'Cette notification de test a été envoyée depuis le serveur!',
      };
      notification1.payload = { 
        type: 'test',
        format: 'complet',
        timestamp: new Date().toISOString()
      };
      notification1.topic = 'com.hushy.app'; // Votre bundle ID
      notification1.pushType = 'alert';
      
      // 2. Notification simplifiée
      const notification2 = new apn.Notification();
      notification2.alert = "Test de notification 2 (simplifié)";
      notification2.topic = 'com.hushy.app';
      
      // 3. Notification ultra-simple
      const notification3 = new apn.Notification();
      notification3.aps = {
        alert: "Test 3",
        badge: 1,
        sound: 'default'
      };
      notification3.topic = 'com.hushy.app';
      
      console.log('[TEST_NOTIF] Détail des notifications:');
      console.log('Notification 1:', JSON.stringify(notification1, null, 2));
      console.log('Notification 2:', JSON.stringify(notification2, null, 2));
      console.log('Notification 3:', JSON.stringify(notification3, null, 2));
      
      // Variable pour stocker les résultats
      let results = {
        notification1: null,
        notification2: null,
        notification3: null
      };
      
      // Envoi de la première notification
      console.log('[TEST_NOTIF] Envoi de la notification 1...');
      try {
        const result1 = await Promise.race([
          apnProvider.send(notification1, token),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout lors de l\'envoi de la notification 1')), 10000))
        ]);
        
        console.log('[TEST_NOTIF] Résultat de la notification 1:', JSON.stringify(result1, null, 2));
        results.notification1 = result1;
        
        // Si la première notification a réussi, pas besoin d'essayer les autres
        if (result1.sent && result1.sent.length > 0) {
          console.log('[TEST_NOTIF] Notification 1 envoyée avec succès, pas besoin des autres formats');
          
          // Nettoyage des gestionnaires d'événements
          apnProvider.removeListener('error', errorHandler);
          apnProvider.removeListener('transmitted', transmittedHandler);
          apnProvider.removeListener('completed', completeHandler);
          
          return res.status(200).json({
            success: true,
            message: 'Notification de test envoyée avec succès (format 1)',
            result: result1
          });
        }
        
        // Si échec, essayer le format 2
        console.log('[TEST_NOTIF] Notification 1 échouée, essai du format 2...');
        
      } catch (error) {
        console.error('[TEST_NOTIF] Erreur lors de l\'envoi de la notification 1:', error);
        results.notification1 = { error: error.message };
        
        // Continuer avec le format 2
        console.log('[TEST_NOTIF] Après erreur, essai du format 2...');
      }
      
      // Envoi de la deuxième notification
      try {
        const result2 = await Promise.race([
          apnProvider.send(notification2, token),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout lors de l\'envoi de la notification 2')), 10000))
        ]);
        
        console.log('[TEST_NOTIF] Résultat de la notification 2:', JSON.stringify(result2, null, 2));
        results.notification2 = result2;
        
        // Si la deuxième notification a réussi, pas besoin d'essayer la troisième
        if (result2.sent && result2.sent.length > 0) {
          console.log('[TEST_NOTIF] Notification 2 envoyée avec succès, pas besoin du format 3');
          
          // Nettoyage des gestionnaires d'événements
          apnProvider.removeListener('error', errorHandler);
          apnProvider.removeListener('transmitted', transmittedHandler);
          apnProvider.removeListener('completed', completeHandler);
          
          return res.status(200).json({
            success: true,
            message: 'Notification de test envoyée avec succès (format 2)',
            result: result2
          });
        }
        
        // Si échec, essayer le format 3
        console.log('[TEST_NOTIF] Notification 2 échouée, essai du format 3...');
        
      } catch (error) {
        console.error('[TEST_NOTIF] Erreur lors de l\'envoi de la notification 2:', error);
        results.notification2 = { error: error.message };
        
        // Continuer avec le format 3
        console.log('[TEST_NOTIF] Après erreur, essai du format 3...');
      }
      
      // Envoi de la troisième notification
      try {
        const result3 = await Promise.race([
          apnProvider.send(notification3, token),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout lors de l\'envoi de la notification 3')), 10000))
        ]);
        
        console.log('[TEST_NOTIF] Résultat de la notification 3:', JSON.stringify(result3, null, 2));
        results.notification3 = result3;
        
        // Si la troisième notification a réussi
        if (result3.sent && result3.sent.length > 0) {
          console.log('[TEST_NOTIF] Notification 3 envoyée avec succès');
          
          // Nettoyage des gestionnaires d'événements
          apnProvider.removeListener('error', errorHandler);
          apnProvider.removeListener('transmitted', transmittedHandler);
          apnProvider.removeListener('completed', completeHandler);
          
          return res.status(200).json({
            success: true,
            message: 'Notification de test envoyée avec succès (format 3)',
            result: result3
          });
        }
        
      } catch (error) {
        console.error('[TEST_NOTIF] Erreur lors de l\'envoi de la notification 3:', error);
        results.notification3 = { error: error.message };
      }
      
      // Si nous arrivons ici, c'est que tous les formats ont échoué
      console.log('[TEST_NOTIF] Tous les formats de notification ont échoué');
      
      // Vérifier s'il y a une erreur plus détaillée dans l'un des résultats
      let detailedError = {};
      
      for (const [format, result] of Object.entries(results)) {
        if (result && result.failed && result.failed.length > 0) {
          if (result.failed[0].error && Object.keys(result.failed[0].error).length > 0) {
            detailedError = {
              format,
              status: result.failed[0].status,
              response: result.failed[0].response,
              error: result.failed[0].error
            };
            break;
          }
        }
      }
      
      // Si aucune erreur détaillée n'a été trouvée, utiliser le dernier résultat
      if (Object.keys(detailedError).length === 0 && results.notification3) {
        detailedError = {
          format: 'notification3',
          error: results.notification3.error || results.notification3
        };
      }
      
      // Nettoyage des gestionnaires d'événements
      apnProvider.removeListener('error', errorHandler);
      apnProvider.removeListener('transmitted', transmittedHandler);
      apnProvider.removeListener('completed', completeHandler);
      
      // Renvoyer tous les résultats
      return res.status(200).json({
        success: false,
        message: 'Échec de l\'envoi des notifications sur tous les formats',
        results,
        error: detailedError
      });
    }
    
    // Si aucun token n'est fourni, tenter de récupérer celui de l'utilisateur
    console.log(`[TEST_NOTIF] Recherche du token de l'utilisateur ${userId}`);
    try {
      const user = await User.findById(userId);
      if (!user || !user.expoPushToken) {
        console.log(`[TEST_NOTIF] Aucun token trouvé pour l'utilisateur ${userId}`);
        
        // Nettoyage des gestionnaires d'événements
        apnProvider.removeListener('error', errorHandler);
        apnProvider.removeListener('transmitted', transmittedHandler);
        apnProvider.removeListener('completed', completeHandler);
        
        return res.status(404).json({
          success: false,
          message: 'Aucun token de notification trouvé pour cet utilisateur'
        });
      }
      
      const userToken = user.expoPushToken;
      console.log(`[TEST_NOTIF] Token trouvé pour l'utilisateur: ${userToken}`);
      
      // Vérifier si c'est un token Expo
      if (userToken.startsWith('ExponentPushToken[')) {
        console.log(`[TEST_NOTIF] Token Expo détecté, non compatible avec APNs direct`);
        
        // Nettoyage des gestionnaires d'événements
        apnProvider.removeListener('error', errorHandler);
        apnProvider.removeListener('transmitted', transmittedHandler);
        apnProvider.removeListener('completed', completeHandler);
        
        return res.status(400).json({
          success: false,
          message: 'Token Expo détecté, non compatible avec APNs direct',
          tokenType: 'expo'
        });
      }
      
      // Utiliser le même code que pour un token spécifique
      // ... (code similaire à celui ci-dessus pour l'envoi avec userToken)
      
    } catch (error) {
      console.error(`[TEST_NOTIF] Erreur lors de la recherche du token de l'utilisateur:`, error);
      
      // Nettoyage des gestionnaires d'événements
      apnProvider.removeListener('error', errorHandler);
      apnProvider.removeListener('transmitted', transmittedHandler);
      apnProvider.removeListener('completed', completeHandler);
      
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche du token de l\'utilisateur',
        error: error.message
      });
    }
  } catch (error) {
    console.error('[TEST_NOTIF] Erreur globale dans la fonction sendTestNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du test de notification',
      error: error.message
    });
  } finally {
    console.log('=== FIN DE LA FONCTION sendTestNotification ===');
  }
};

// Fonctions de base pour les autres types de notifications
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

// Notification d'événement
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

// Notification de statistiques
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

// Notification de bienvenue
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