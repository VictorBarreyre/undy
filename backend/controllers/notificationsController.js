const User = require('../models/User');
const Secret = require('../models/Secret');
const Conversation = require('../models/Conversation');
const apn = require('node-apn');
const fs = require('fs');
const { i18next, translate } = require('../i18n-config');

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


/**
 * Enregistre un token de notification push pour un utilisateur
 * Accepte à la fois les tokens APNs et Expo
 * 
 * @param {Object} req - Requête HTTP avec userId et token
 * @param {Object} res - Réponse HTTP
 * @returns {Object} Statut de l'opération
 */
const registerToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const userId = req.user._id;
    const userLanguage = req.user.language || 'fr';

    console.log(`[TOKEN] Tentative d'enregistrement du token ${expoPushToken} pour l'utilisateur ${userId}`);

    if (!expoPushToken) {
      console.log('[TOKEN] Token manquant dans la requête');
      return res.status(400).json({
        success: false,
        message: translate('missingPushToken', { lng: userLanguage })
      });
    }

    // Valider le token (accepte les tokens APNs et Expo)
    const isValidToken =
      expoPushToken.startsWith('ExponentPushToken[') || // Token Expo
      expoPushToken.match(/^[a-f0-9]{64}$/i) || // Token APNs (hexadécimal 64 caractères)
      expoPushToken === "SIMULATOR_MOCK_TOKEN"; // Token de simulateur

    if (!isValidToken) {
      console.log('[TOKEN] Token invalide:', expoPushToken);
      return res.status(400).json({
        success: false,
        message: translate('invalidPushToken', { lng: userLanguage })
      });
    }

    // Trouver l'utilisateur actuel pour obtenir ses données
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      console.log('[TOKEN] Utilisateur non trouvé:', userId);
      return res.status(404).json({
        success: false,
        message: translate('userNotFound', { lng: userLanguage })
      });
    }

    // Si le token est identique à celui déjà enregistré, ne pas mettre à jour la base de données
    if (currentUser.expoPushToken === expoPushToken) {
      console.log('[TOKEN] Le token fourni est déjà enregistré pour cet utilisateur');
      return res.status(200).json({
        success: true,
        message: translate('tokenAlreadyRegistered', { lng: userLanguage }),
        unchanged: true
      });
    }

    // Mettre à jour le token dans la base de données
    await User.findByIdAndUpdate(userId, { expoPushToken });
    console.log(`[TOKEN] Token enregistré avec succès pour l'utilisateur ${userId}`);

    res.status(200).json({
      success: true,
      message: translate('tokenRegisteredSuccess', { lng: userLanguage })
    });
  } catch (error) {
    console.error('[TOKEN] Erreur lors de l\'enregistrement du token:', error);
    res.status(500).json({
      success: false,
      message: translate('serverError', { lng: req.user?.language || 'fr' })
    });
  }
};

/**
 * Envoie une notification de test pour valider la configuration
 * Compatible avec les tokens APNs et Expo
 * 
 * @param {Object} req - Requête HTTP avec userId et token optionnel
 * @param {Object} res - Réponse HTTP
 * @returns {Object} Résultat du test
 */
/**
 * Envoie une notification de test pour valider la configuration
 * Compatible avec les tokens APNs et Expo
 * 
 * @param {Object} req - Requête HTTP avec userId et token optionnel
 * @param {Object} res - Réponse HTTP
 * @returns {Object} Résultat du test
 */
const sendTestNotification = async (req, res) => {
  console.log('=== DÉBUT DE LA FONCTION sendTestNotification ===');

  try {
    const userId = req.user._id;
    const { token } = req.body; // Token optionnel pour tester
    const userLanguage = req.user.language || 'fr';

    console.log(`[TEST_NOTIF] Utilisateur: ${userId}, Langue: ${userLanguage}`);
    console.log(`[TEST_NOTIF] Token fourni: ${token || 'aucun'}`);

    // Vérification de la configuration APNs
    if (!apnProvider) {
      console.error('[TEST_NOTIF] ERREUR: Le provider APNs n\'est pas initialisé');
      return res.status(500).json({
        success: false,
        message: translate('apnsProviderNotInitialized', { lng: userLanguage }),
        error: 'PROVIDER_NOT_INITIALIZED'
      });
    }

    // Si un token spécifique est fourni, l'utiliser directement
    if (token) {
      console.log(`[TEST_NOTIF] Utilisation du token spécifié: ${token}`);

      // Traiter le cas du token simulateur
      if (token === "SIMULATOR_MOCK_TOKEN") {
        console.log('[TEST_NOTIF] Token simulateur détecté, envoi d\'une réponse simulée');
        return res.status(200).json({
          success: true,
          message: translate('simulatorTestSuccess', { lng: userLanguage }),
          simulated: true
        });
      }

      // Créer directement la notification et l'envoyer avec le token fourni
      const notification = new apn.Notification();
      notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expire dans 1h
      notification.badge = 1;
      notification.sound = "default";

      // Définir l'alerte - ESSENTIEL POUR QUE LA NOTIFICATION S'AFFICHE
      notification.alert = {
        title: title,
        body: body
      };

      // Structure du payload - ATTENTION à inclure alert, sound et badge dans aps
      notification.payload = {
        aps: {
          // Ces éléments sont OBLIGATOIRES dans l'objet aps
          alert: notification.alert,
          badge: notification.badge,
          sound: notification.sound,
          "mutable-content": 1,
          "content-available": 1
        },
        // Ajouter les données personnalisées en dehors de aps
        type: extraData.type || 'notification',
        conversationId: extraData.conversationId,
        senderId: extraData.senderId,
        messageType: extraData.messageType,
        timestamp: new Date().toISOString()
      };

      notification.topic = bundleId;

      console.log('Notification COMPLÈTE préparée:', JSON.stringify({
        expiry: notification.expiry,
        topic: notification.topic,
        alert: notification.alert,
        sound: notification.sound,
        badge: notification.badge,
        payload: notification.payload
      }, null, 2));

      try {
        console.log(`[TEST_NOTIF] Envoi direct de la notification à ${token}`);
        const response = await apnProvider.send(notification, token);
        console.log('[TEST_NOTIF] Réponse directe APNs:', JSON.stringify(response, null, 2));

        const success = response.sent && response.sent.length > 0;

        // Mettre à jour le token dans la base de données si le test est réussi
        if (success) {
          try {
            await User.findByIdAndUpdate(userId, { expoPushToken: token });
            console.log(`[TEST_NOTIF] Token mis à jour en base de données pour l'utilisateur ${userId}`);
          } catch (updateError) {
            console.error('[TEST_NOTIF] Erreur lors de la mise à jour du token:', updateError);
            // Continuer malgré l'erreur de mise à jour
          }
        }

        return res.status(200).json({
          success: success,
          message: translate(success ? 'testNotificationSuccess' : 'testNotificationFailure', { lng: userLanguage }),
          details: {
            success: success,
            results: {
              sent: response.sent || [],
              failed: response.failed || []
            }
          }
        });
      } catch (error) {
        console.error('[TEST_NOTIF] Erreur lors de l\'envoi direct:', error);
        return res.status(500).json({
          success: false,
          message: translate('serverErrorDuringTest', { lng: userLanguage }),
          error: error.message
        });
      }
    }

    // Si aucun token n'est fourni, tenter de récupérer celui de l'utilisateur
    console.log(`[TEST_NOTIF] Aucun token fourni, recherche du token de l'utilisateur ${userId}`);
    try {
      const user = await User.findById(userId);
      if (!user || !user.expoPushToken) {
        console.log(`[TEST_NOTIF] Aucun token trouvé pour l'utilisateur ${userId}`);
        return res.status(404).json({
          success: false,
          message: translate('noPushTokenFound', { lng: userLanguage })
        });
      }

      const userToken = user.expoPushToken;
      console.log(`[TEST_NOTIF] Token trouvé pour l'utilisateur: ${userToken}`);

      // Envoyer une notification de test avec le token de l'utilisateur
      const notification = new apn.Notification();

      // Configuration de base
      notification.expiry = Math.floor(Date.now() / 1000) + 3600;
      notification.badge = 1;
      notification.sound = "default";

      // Alerte - OBLIGATOIRE pour la notification
      notification.alert = {
        title: translate('testNotificationTitle', { lng: userLanguage }),
        body: translate('testNotificationBody', { lng: userLanguage })
      };

      // Structure complète du payload APNs
      notification.payload = {
        aps: {
          // Répéter certaines informations dans la structure aps
          alert: notification.alert,
          sound: notification.sound,
          badge: notification.badge,
          // Pour permettre la modification du contenu par l'application
          "mutable-content": 1,
          // Pour notifier l'application même en arrière-plan
          "content-available": 1
        },
        // Données personnalisées pour l'application
        type: 'test',
        userId: userId,
        timestamp: new Date().toISOString(),
        testId: Math.random().toString(36).substring(2, 10)
      };

      notification.topic = bundleId;

      // Afficher la notification COMPLÈTE pour le débogage
      console.log('Notification COMPLÈTE DE TEST pour utilisateur:', JSON.stringify({
        expiry: notification.expiry,
        topic: notification.topic,
        alert: notification.alert,
        sound: notification.sound,
        badge: notification.badge,
        payload: notification.payload
      }, null, 2));

      try {
        console.log(`[TEST_NOTIF] Envoi direct de la notification à ${userToken}`);
        const response = await apnProvider.send(notification, userToken);
        console.log('[TEST_NOTIF] Réponse directe APNs:', JSON.stringify(response, null, 2));

        const success = response.sent && response.sent.length > 0;

        return res.status(200).json({
          success: success,
          message: translate(success ? 'testNotificationSuccess' : 'testNotificationFailure', { lng: userLanguage }),
          details: {
            success: success,
            token: userToken,
            results: {
              sent: response.sent || [],
              failed: response.failed || []
            }
          }

        });
      } catch (error) {
        console.error('[TEST_NOTIF] Erreur lors de l\'envoi direct:', error);
        return res.status(500).json({
          success: false,
          message: translate('serverErrorDuringTest', { lng: userLanguage }),
          error: error.message
        });
      }
    } catch (error) {
      console.error(`[TEST_NOTIF] Erreur lors de la recherche du token de l'utilisateur:`, error);
      return res.status(500).json({
        success: false,
        message: translate('errorFindingUserToken', { lng: userLanguage }),
        error: error.message
      });
    }
  } catch (error) {
    console.error('[TEST_NOTIF] Erreur globale dans la fonction sendTestNotification:', error);
    return res.status(500).json({
      success: false,
      message: translate('serverErrorDuringTest', { lng: req.user?.language || 'fr' }),
      error: error.message
    });
  } finally {
    console.log('=== FIN DE LA FONCTION sendTestNotification ===');
  }
};

/**
 * Fonction pour envoyer des notifications push aux utilisateurs
 * Gère la traduction des messages selon la langue de chaque utilisateur
 * 
 * @param {Array} userIds - Tableau d'IDs d'utilisateurs à notifier
 * @param {String} titleKey - Clé de traduction pour le titre ou texte direct
 * @param {Object} titleData - Données pour la traduction du titre (variables)
 * @param {String} bodyKey - Clé de traduction pour le corps ou texte direct
 * @param {Object} bodyData - Données pour la traduction du corps (variables)
 * @param {Object} extraData - Données supplémentaires à inclure dans la notification
 * @returns {Object} Résultat de l'opération avec succès et détails
 */
const sendPushNotifications = async (userIds, titleKey, titleData = {}, bodyKey, bodyData = {}, extraData = {}) => {
  try {
    console.log('Début de sendPushNotifications avec userIds:', userIds);
    console.log('TitleKey:', titleKey, 'TitleData:', titleData);
    console.log('BodyKey:', bodyKey, 'BodyData:', bodyData);

    // Vérifier la configuration du provider APNs
    if (!apnProvider) {
      console.log('Provider APNs non configuré, impossible d\'envoyer des notifications');
      return { success: false, message: 'Provider APNs non configuré' };
    }

    // Récupérer les utilisateurs avec leur langue préférée
    const users = await User.find({ _id: { $in: userIds } });
    console.log(`Nombre d'utilisateurs trouvés: ${users.length}`);

    // Préparation des résultats
    const results = { sent: [], failed: [] };

    // Traiter chaque utilisateur
    for (const user of users) {
      console.log(`Traitement de l'utilisateur ${user._id}, token: ${user.expoPushToken || 'non défini'}, langue: ${user.language || 'fr'}`);

      // Vérifier que l'utilisateur a un token
      if (!user.expoPushToken) {
        console.log(`Pas de token pour l'utilisateur ${user._id}, on passe au suivant`);
        results.failed.push({
          userId: user._id,
          reason: 'Token manquant'
        });
        continue;
      }

      // Vérifier le type de token
      const isExpoToken = user.expoPushToken.startsWith('ExponentPushToken[');
      console.log(`Token type: ${isExpoToken ? 'Expo' : 'APNs'}`);

      // Les tokens Expo ne sont pas pris en charge directement
      if (isExpoToken) {
        console.log(`Token Expo détecté pour l'utilisateur ${user._id}, non supporté sans EAS`);
        results.failed.push({
          userId: user._id,
          reason: 'Token Expo détecté, EAS requis'
        });
        continue;
      }

      // Déterminer la langue de l'utilisateur (français par défaut)
      const userLanguage = user.language || 'fr';
      console.log(`Langue de l'utilisateur: ${userLanguage}`);

      // Traduction du titre et du corps selon la langue
      let title, body;

      // Traduire le titre
      if (typeof titleKey === 'string') {
        // Si c'est une clé standard de traduction
        title = translate(titleKey, { lng: userLanguage, ...titleData });
      } else {
        // Si c'est un texte direct ou un autre type
        title = titleKey;
      }

      // Traduire le corps
      if (typeof bodyKey === 'string') {
        // Si c'est une clé de traduction avec préfixe KEY_
        if (bodyKey.startsWith('KEY_')) {
          body = translate(bodyKey.substring(4), { lng: userLanguage, ...bodyData });
        } else {
          // Si c'est une clé standard ou un texte direct
          body = translate(bodyKey, { lng: userLanguage, ...bodyData });
        }
      } else {
        // Si c'est un autre type
        body = bodyKey;
      }

      console.log(`Notification traduite: Titre="${title}" Corps="${body}"`);

      try {
        // Créer la notification APNs
        const notification = new apn.Notification();
        notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expire dans 1h
        notification.badge = 1;
        notification.sound = "default";

        // Définir l'alerte - ESSENTIEL POUR QUE LA NOTIFICATION S'AFFICHE
        notification.alert = {
          title: title,
          body: body
        };

        // Structure du payload - ATTENTION à inclure alert, sound et badge dans aps
        notification.payload = {
          aps: {
            // Ces éléments sont OBLIGATOIRES dans l'objet aps
            alert: notification.alert,
            badge: notification.badge,
            sound: notification.sound,
            "mutable-content": 1,
            "content-available": 1
          },
          // Ajouter les données personnalisées en dehors de aps
          type: extraData.type || 'notification',
          conversationId: extraData.conversationId,
          senderId: extraData.senderId,
          messageType: extraData.messageType,
          timestamp: new Date().toISOString()
        };

        notification.topic = bundleId;

        console.log('Notification COMPLÈTE préparée:', JSON.stringify({
          expiry: notification.expiry,
          topic: notification.topic,
          alert: notification.alert,
          sound: notification.sound,
          badge: notification.badge,
          payload: notification.payload
        }, null, 2));

        // Envoyer la notification
        console.log(`Envoi de la notification à ${user.expoPushToken}`);
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
          results.failed.push({
            userId: user._id,
            token: user.expoPushToken,
            reason: 'Résultat indéterminé'
          });
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

// Notification de nouveau message avec support multilingue
const sendMessageNotification = async (req, res) => {
  try {
    const { conversationId, senderId, senderName, messagePreview, messageType = 'text' } = req.body;

    // Log amélioré pour débogage
    console.log('[NOTIFICATION] Données reçues:', {
      conversationId,
      senderId,
      senderName,
      messagePreview: messagePreview?.substring(0, 50),
      messageType
    });

    // Vérifier les paramètres requis
    if (!conversationId || !senderId) {
      console.log('[NOTIFICATION] Paramètres manquants:', { conversationId, senderId });
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants'
      });
    }

    // Assurer que senderId est bien une chaîne
    const senderIdStr = typeof senderId === 'string' ? senderId : senderId.toString();
    console.log('[NOTIFICATION] ID de l\'expéditeur (chaîne):', senderIdStr);

    // Récupérer la conversation avec TOUS les participants et leurs tokens
    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: 'participants',
        select: '_id name language expoPushToken'
      });

    if (!conversation) {
      console.log('[NOTIFICATION] Conversation non trouvée:', conversationId);
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Log détaillé des participants avec leurs IDs
    console.log('[NOTIFICATION] Participants de la conversation:',
      conversation.participants.map(p => ({
        id: typeof p._id === 'string' ? p._id : p._id.toString(),
        name: p.name,
        hasToken: !!p.expoPushToken
      }))
    );

    // Filtrer les participants UNIQUEMENT par ID (en s'assurant que la comparaison est faite avec des chaînes)
    const recipientIds = conversation.participants
      .filter(p => {
        const participantIdStr = typeof p._id === 'string' ? p._id : p._id.toString();
        const isExpéditeur = participantIdStr === senderIdStr;
        const hasToken = !!p.expoPushToken;

        console.log(`[NOTIFICATION] Évaluation du participant ${participantIdStr}:`, {
          isExpéditeur,
          hasToken,
          include: !isExpéditeur && hasToken
        });

        return !isExpéditeur && hasToken; // Exclure l'expéditeur et garder que ceux avec token
      })
      .map(p => typeof p._id === 'string' ? p._id : p._id.toString());

    console.log('[NOTIFICATION] IDs des destinataires après filtrage:', recipientIds);

    if (recipientIds.length === 0) {
      console.log('[NOTIFICATION] Aucun destinataire valide trouvé');
      return res.status(200).json({
        success: true,
        message: 'Aucun destinataire à notifier'
      });
    }

    // Tronquer le message s'il est trop long
    const truncatedMessage = messagePreview?.length > 100
      ? messagePreview.substring(0, 97) + '...'
      : messagePreview || '';

    // Envoyer la notification aux autres participants
    const notificationResult = await sendPushNotifications(
      recipientIds,
      'messageFrom',         // Clé pour le titre
      { senderName },        // Données pour le titre
      truncatedMessage,      // Message
      {},                    // Données supplémentaires pour le corps
      {
        type: 'new_message',
        conversationId,
        senderId: senderIdStr,
        messageType,
        timestamp: new Date().toISOString()
      }
    );

    console.log('[NOTIFICATION] Résultat de l\'envoi:', notificationResult);

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

// Notification d'achat de secret avec support multilingue
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

    // Récupérer les informations du secret et la langue du vendeur
    const secret = await Secret.findById(secretId).populate('user', '_id name language');

    if (!secret) {
      return res.status(404).json({
        success: false,
        message: 'Secret non trouvé'
      });
    }

    // Ne pas notifier si l'acheteur est aussi le vendeur
    if (buyerId === secret.user._id.toString()) {
      return res.status(200).json({
        success: true,
        message: 'Pas de notification, acheteur = vendeur'
      });
    }

    // Formater le prix
    const formattedPrice = `${price} ${currency}`;

    // Envoyer la notification au vendeur seulement
    const notificationResult = await sendPushNotifications(
      [secret.user._id.toString()],
      'secretSold',           // Clé pour le titre
      {},                     // Pas de paramètres pour le titre
      'KEY_secretPurchased',  // Clé pour le corps
      {                       // Données pour le corps
        buyerName,
        price: formattedPrice
      },
      {                       // Données supplémentaires
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



// Notification de rappel Stripe avec support multilingue
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
      'stripeReminder',           // Clé pour le titre
      {},                         // Pas de paramètres pour le titre
      'KEY_stripeReminder',       // Clé pour le corps
      {},                         // Pas de paramètres pour le corps
      {                           // Données supplémentaires
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


// Export du contrôleur
module.exports = {
  registerToken,
  sendTestNotification,
  sendMessageNotification,
  sendPurchaseNotification,
  sendStripeReminderNotification,
};