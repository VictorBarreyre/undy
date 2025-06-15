const User = require('../models/User');
const Secret = require('../models/Secret');
const Conversation = require('../models/Conversation');
const apn = require('node-apn');
const { i18next, translate } = require('../i18n-config');

const apnsKeyId = process.env.APNS_KEY_ID;
const apnsTeamId = process.env.APPLE_TEAM_ID;
const apnsKey = process.env.APNS_KEY;
const apnsProduction = process.env.APNS_PRODUCTION === 'true';
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

// Initialisation avec JWT
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
 * Valide un token APNs
 * @param {string} token - Token à valider
 * @returns {boolean} - True si le token est valide
 */
const isValidApnsToken = (token) => {
  return token.match(/^[a-f0-9]{64}$/i) || token === "SIMULATOR_MOCK_TOKEN";
};

/**
 * Enregistre un token de notification push APNs pour un utilisateur
 * 
 * @param {Object} req - Requête HTTP avec userId et token
 * @param {Object} res - Réponse HTTP
 * @returns {Object} Statut de l'opération
 */
const registerToken = async (req, res) => {
  try {
    const { apnsToken } = req.body;
    const userId = req.user._id;
    const userLanguage = req.user.language || 'fr';

    console.log(`[TOKEN] Tentative d'enregistrement du token ${apnsToken} pour l'utilisateur ${userId}`);

    if (!apnsToken) {
      console.log('[TOKEN] Token manquant dans la requête');
      return res.status(400).json({
        success: false,
        message: translate('missingPushToken', { lng: userLanguage })
      });
    }

    // Valider le token APNs
    if (!isValidApnsToken(apnsToken)) {
      console.log('[TOKEN] Token APNs invalide:', apnsToken);
      return res.status(400).json({
        success: false,
        message: translate('invalidPushToken', { lng: userLanguage })
      });
    }

    // Trouver l'utilisateur actuel
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      console.log('[TOKEN] Utilisateur non trouvé:', userId);
      return res.status(404).json({
        success: false,
        message: translate('userNotFound', { lng: userLanguage })
      });
    }

    // Si le token est identique à celui déjà enregistré, ne pas mettre à jour
    if (currentUser.apnsToken === apnsToken) {
      console.log('[TOKEN] Le token fourni est déjà enregistré pour cet utilisateur');
      return res.status(200).json({
        success: true,
        message: translate('tokenAlreadyRegistered', { lng: userLanguage }),
        unchanged: true
      });
    }

    // Mettre à jour le token dans la base de données
    await User.findByIdAndUpdate(userId, { apnsToken });
    console.log(`[TOKEN] Token APNs enregistré avec succès pour l'utilisateur ${userId}`);

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
 * Crée une notification APNs avec le titre et le corps spécifiés
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps de la notification
 * @param {Object} extraData - Données supplémentaires
 * @returns {apn.Notification} - Notification APNs configurée
 */
const createApnsNotification = (title, body, extraData = {}) => {
  const notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
  notification.badge = 1;
  notification.sound = "default";
  notification.topic = bundleId;

  notification.alert = {
    title: title,
    body: body
  };

  // Structure du payload pour une navigation propre
  notification.payload = {
    // Données pour la navigation
    type: extraData.type || 'new_message',
    conversationId: extraData.conversationId,
    senderId: extraData.senderId,
    senderName: extraData.senderName,
    messageType: extraData.messageType || 'text',
    timestamp: extraData.timestamp || new Date().toISOString()
  };

  // Activer le content-available pour les notifications en arrière-plan
  notification.contentAvailable = true;

  console.log('Notification APNs créée:', {
    topic: notification.topic,
    payload: notification.payload
  });

  return notification;
};

/**
 * Envoie une notification de test pour valider la configuration APNs
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

    let targetToken;

    // Si un token spécifique est fourni, l'utiliser
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

      targetToken = token;
    } else {
      // Récupérer le token de l'utilisateur
      console.log(`[TEST_NOTIF] Recherche du token de l'utilisateur ${userId}`);
      const user = await User.findById(userId);

      if (!user || !user.apnsToken) {
        console.log(`[TEST_NOTIF] Aucun token APNs trouvé pour l'utilisateur ${userId}`);
        return res.status(404).json({
          success: false,
          message: translate('noPushTokenFound', { lng: userLanguage })
        });
      }

      targetToken = user.apnsToken;
    }

    console.log(`[TEST_NOTIF] Token cible: ${targetToken}`);

    // Créer la notification de test
    const title = translate('testNotificationTitle', { lng: userLanguage });
    const body = translate('testNotificationBody', { lng: userLanguage });

    const notification = createApnsNotification(title, body, {
      type: 'test',
      userId: userId,
      testId: Math.random().toString(36).substring(2, 10)
    });

    console.log('Notification de test préparée:', JSON.stringify({
      expiry: notification.expiry,
      topic: notification.topic,
      alert: notification.alert,
      sound: notification.sound,
      badge: notification.badge,
      payload: notification.payload
    }, null, 2));

    try {
      console.log(`[TEST_NOTIF] Envoi de la notification à ${targetToken}`);
      const response = await apnProvider.send(notification, targetToken);
      console.log('[TEST_NOTIF] Réponse APNs:', JSON.stringify(response, null, 2));

      const success = response.sent && response.sent.length > 0;

      // Mettre à jour le token en base si le test est réussi et qu'un token était fourni
      if (success && token && token !== "SIMULATOR_MOCK_TOKEN") {
        try {
          await User.findByIdAndUpdate(userId, { apnsToken: token });
          console.log(`[TEST_NOTIF] Token mis à jour en base pour l'utilisateur ${userId}`);
        } catch (updateError) {
          console.error('[TEST_NOTIF] Erreur lors de la mise à jour du token:', updateError);
        }
      }

      return res.status(200).json({
        success: success,
        message: translate(success ? 'testNotificationSuccess' : 'testNotificationFailure', { lng: userLanguage }),
        details: {
          success: success,
          token: targetToken,
          results: {
            sent: response.sent || [],
            failed: response.failed || []
          }
        }
      });
    } catch (error) {
      console.error('[TEST_NOTIF] Erreur lors de l\'envoi:', error);
      return res.status(500).json({
        success: false,
        message: translate('serverErrorDuringTest', { lng: userLanguage }),
        error: error.message
      });
    }
  } catch (error) {
    console.error('[TEST_NOTIF] Erreur globale dans sendTestNotification:', error);
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
 * Fonction pour envoyer des notifications push APNs aux utilisateurs
 * Gère la traduction des messages selon la langue de chaque utilisateur
 * 
 * @param {Array} userIds - Tableau d'IDs d'utilisateurs à notifier
 * @param {String} titleKey - Clé de traduction pour le titre ou texte direct
 * @param {Object} titleData - Données pour la traduction du titre
 * @param {String} bodyKey - Clé de traduction pour le corps ou texte direct
 * @param {Object} bodyData - Données pour la traduction du corps
 * @param {Object} extraData - Données supplémentaires à inclure dans la notification
 * @returns {Object} Résultat de l'opération avec succès et détails
 */
const sendPushNotifications = async (userIds, titleKey, titleData = {}, bodyKey, bodyData = {}, extraData = {}) => {
  try {
    console.log('Début de sendPushNotifications avec userIds:', userIds);
    console.log('TitleKey:', titleKey, 'TitleData:', titleData);
    console.log('BodyKey:', bodyKey, 'BodyData:', bodyData);
    console.log('ExtraData:', extraData);

    // Vérifier la configuration du provider APNs
    if (!apnProvider) {
      console.log('Provider APNs non configuré, impossible d\'envoyer des notifications');
      return { success: false, message: 'Provider APNs non configuré' };
    }

    // Récupérer les utilisateurs avec leur langue préférée et token APNs
    const users = await User.find({ 
      _id: { $in: userIds },
      apnsToken: { $exists: true, $ne: null }
    });
    
    console.log(`Nombre d'utilisateurs trouvés avec token APNs: ${users.length}`);

    // Préparation des résultats
    const results = { sent: [], failed: [] };

    // Traiter chaque utilisateur
    for (const user of users) {
      console.log(`Traitement de l'utilisateur ${user._id}, token: ${user.apnsToken}, langue: ${user.language || 'fr'}`);

      // Déterminer la langue de l'utilisateur (français par défaut)
      const userLanguage = user.language || 'fr';
      console.log(`Langue de l'utilisateur: ${userLanguage}`);

      // Traduction du titre et du corps selon la langue
      let title, body;

      // Traduire le titre
      if (typeof titleKey === 'string') {
        title = translate(titleKey, { lng: userLanguage, ...titleData });
      } else {
        title = titleKey;
      }

      // Traduire le corps - VERSION CORRIGÉE
      if (typeof bodyKey === 'string') {
        // Liste des clés de traduction connues
        const knownTranslationKeys = [
          'audioMessage', 'imageMessage', 'videoMessage', 'mixedMessage', 'newMessage',
          'secretSold', 'secretPurchased', 'nearbySecrets', 'stripeReminder',
          'eventNotification', 'statsUpdate', 'welcomeBack'
        ];
        
        // Vérifier si c'est une clé de traduction ou du contenu direct
        if (bodyKey.startsWith('KEY_')) {
          // Préfixe KEY_ explicite
          body = translate(bodyKey.substring(4), { lng: userLanguage, ...bodyData });
        } else if (extraData.isTranslationKey || knownTranslationKeys.includes(bodyKey)) {
          // C'est une clé de traduction
          body = translate(bodyKey, { lng: userLanguage, ...bodyData });
        } else {
          // C'est du contenu direct (message utilisateur)
          // Ne pas traduire, utiliser tel quel
          body = bodyKey || '';
        }
      } else {
        body = bodyKey || '';
      }

      console.log(`Notification traduite: Titre="${title}" Corps="${body}"`);

      try {
        // Créer la notification APNs
        const notification = createApnsNotification(title, body, extraData);

        console.log('Notification préparée:', JSON.stringify({
          expiry: notification.expiry,
          topic: notification.topic,
          alert: notification.alert,
          sound: notification.sound,
          badge: notification.badge,
          payload: notification.payload
        }, null, 2));

        // Envoyer la notification
        console.log(`Envoi de la notification à ${user.apnsToken}`);
        const response = await apnProvider.send(notification, user.apnsToken);
        console.log('Réponse APNs:', JSON.stringify(response, null, 2));

        // Vérifier le résultat
        if (response.failed && response.failed.length > 0) {
          console.log('Échec de l\'envoi:', JSON.stringify(response.failed[0], null, 2));
          results.failed.push({
            userId: user._id,
            token: user.apnsToken,
            reason: response.failed[0].response || response.failed[0].error || 'Raison inconnue'
          });
        } else if (response.sent && response.sent.length > 0) {
          console.log('Notification envoyée avec succès');
          results.sent.push({
            userId: user._id,
            token: user.apnsToken
          });
        } else {
          console.log('Résultat indéterminé:', JSON.stringify(response, null, 2));
          results.failed.push({
            userId: user._id,
            token: user.apnsToken,
            reason: 'Résultat indéterminé'
          });
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
        results.failed.push({
          userId: user._id,
          token: user.apnsToken,
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

/**
 * Notification de nouveau message avec support multilingue
 */
const sendMessageNotification = async (req, res) => {
  try {
    const { conversationId, senderId, senderName, messagePreview, messageType = 'text' } = req.body;

    console.log('[NOTIFICATION] Données reçues:', {
      conversationId,
      senderId,
      senderName,
      messagePreview: messagePreview?.substring(0, 50),
      messageType,
      senderIdType: typeof senderId
    });

    // Validation des paramètres requis
    if (!conversationId || !senderId) {
      console.log('[NOTIFICATION] Paramètres manquants:', { conversationId, senderId });
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants'
      });
    }

    // Conversion sécurisée du senderId
    const senderIdStr = senderId ? String(senderId) : null;
    if (!senderIdStr) {
      console.log('[NOTIFICATION] senderId invalide:', senderId);
      return res.status(400).json({
        success: false,
        message: 'senderId invalide'
      });
    }
    
    console.log('[NOTIFICATION] ID de l\'expéditeur normalisé:', senderIdStr);

    // Récupérer la conversation avec les participants
    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: 'participants',
        select: '_id name language apnsToken'
      });

    if (!conversation) {
      console.log('[NOTIFICATION] Conversation non trouvée:', conversationId);
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Debug: afficher tous les participants
    console.log('[NOTIFICATION] Participants de la conversation:');
    conversation.participants.forEach((p, index) => {
      const participantIdStr = p._id ? String(p._id) : 'ID_INVALIDE';
      console.log(`  Participant ${index + 1}:`, {
        id: participantIdStr,
        name: p.name,
        hasToken: !!p.apnsToken,
        tokenPreview: p.apnsToken ? p.apnsToken.substring(0, 8) + '...' : 'Aucun'
      });
    });

    // Filtrer pour obtenir les destinataires (tous sauf l'expéditeur)
    const recipients = conversation.participants.filter(participant => {
      // Conversion sécurisée de l'ID du participant
      const participantIdStr = participant._id ? String(participant._id) : null;
      
      if (!participantIdStr) {
        console.log('[NOTIFICATION] Participant avec ID invalide ignoré');
        return false;
      }

      // Comparaison stricte des IDs normalisés
      const isSender = participantIdStr === senderIdStr;
      const hasValidToken = !!participant.apnsToken && participant.apnsToken !== 'SIMULATOR_MOCK_TOKEN';
      
      console.log('[NOTIFICATION] Évaluation participant:', {
        participantId: participantIdStr,
        participantName: participant.name,
        isSender: isSender,
        hasValidToken: hasValidToken,
        shouldNotify: !isSender && hasValidToken
      });
      
      // Ne notifier que les participants qui ne sont PAS l'expéditeur ET qui ont un token valide
      return !isSender && hasValidToken;
    });

    // Extraire les IDs des destinataires
    const recipientIds = recipients.map(p => String(p._id));

    console.log('[NOTIFICATION] Récapitulatif:');
    console.log('  - Nombre total de participants:', conversation.participants.length);
    console.log('  - Nombre de destinataires à notifier:', recipientIds.length);
    console.log('  - IDs des destinataires:', recipientIds);

    if (recipientIds.length === 0) {
      console.log('[NOTIFICATION] Aucun destinataire valide trouvé');
      return res.status(200).json({
        success: true,
        message: 'Aucun destinataire à notifier',
        details: {
          totalParticipants: conversation.participants.length,
          reason: 'Tous les participants sont soit l\'expéditeur, soit sans token valide'
        }
      });
    }

    // Préparer l'aperçu du message selon le type
    let notificationPreview = messagePreview;
    let useTranslationKey = false;
    
    if (!messagePreview || messagePreview.trim() === '') {
      // Pas de preview fourni, utiliser une clé de traduction selon le type
      useTranslationKey = true;
      switch (messageType) {
        case 'video':
          notificationPreview = "videoMessage";
          break;
        case 'image':
          notificationPreview = "imageMessage";
          break;
        case 'audio':
          notificationPreview = "audioMessage";
          break;
        case 'mixed':
          notificationPreview = "mixedMessage";
          break;
        default:
          notificationPreview = "newMessage";
      }
      console.log('[NOTIFICATION] Utilisation de la clé de traduction:', notificationPreview);
    } else {
      // Tronquer le message si nécessaire
      notificationPreview = messagePreview.length > 100
        ? messagePreview.substring(0, 97) + '...'
        : messagePreview;
      console.log('[NOTIFICATION] Message preview tronqué:', notificationPreview);
    }

    // Envoyer les notifications
    const notificationResult = await sendPushNotifications(
      recipientIds,
      'messageFrom',  // Clé de traduction pour le titre
      { senderName },
      notificationPreview,
      {},
      {
        type: 'new_message',
        conversationId: String(conversationId),
        senderId: senderIdStr,
        senderName,
        messageType,
        timestamp: new Date().toISOString(),
        // Données pour la navigation dans l'app
        navigationTarget: 'Chat',
        navigationScreen: 'ChatTab',
        navigationParams: { 
          conversationId: String(conversationId)
        },
        // Indiquer si le body est une clé de traduction
        isTranslationKey: useTranslationKey
      }
    );

    console.log('[NOTIFICATION] Résultat de l\'envoi:', {
      success: notificationResult.success,
      sentCount: notificationResult.results?.sent?.length || 0,
      failedCount: notificationResult.results?.failed?.length || 0
    });

    // Réponse détaillée
    res.status(200).json({
      success: true,
      message: 'Notifications de message envoyées',
      details: {
        ...notificationResult,
        summary: {
          totalParticipants: conversation.participants.length,
          notifiedCount: recipientIds.length,
          senderId: senderIdStr,
          senderName: senderName
        }
      }
    });

  } catch (error) {
    console.error('[NOTIFICATION] Erreur lors de l\'envoi de la notification de message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Notification d'achat de secret avec support multilingue
 */
const sendPurchaseNotification = async (req, res) => {
  try {
    const { secretId, buyerId, buyerName, price, currency } = req.body;

    console.log('[PURCHASE_NOTIFICATION] Début avec données:', {
      secretId,
      buyerId,
      buyerName,
      price,
      currency
    });

    // Vérifier les paramètres requis
    if (!secretId || !buyerId) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants'
      });
    }

    // Récupérer les informations du secret et la langue du vendeur
    const secret = await Secret.findById(secretId).populate('user', '_id name language apnsToken');

    if (!secret) {
      return res.status(404).json({
        success: false,
        message: 'Secret non trouvé'
      });
    }

    console.log('[PURCHASE_NOTIFICATION] Vendeur trouvé:', {
      sellerId: secret.user._id,
      sellerName: secret.user.name,
      sellerLanguage: secret.user.language,
      hasApnsToken: !!secret.user.apnsToken
    });

    // CORRECTION ICI : Comparer les IDs correctement
    // Convertir les deux en string pour la comparaison
    const sellerIdStr = secret.user._id.toString();
    const buyerIdStr = buyerId.toString();
    
    // Ne pas notifier si l'acheteur est aussi le vendeur
    if (buyerIdStr === sellerIdStr) {
      console.log('[PURCHASE_NOTIFICATION] L\'acheteur est le vendeur, pas de notification');
      return res.status(200).json({
        success: true,
        message: 'Pas de notification nécessaire (auto-achat)'
      });
    }
    
    // Vérifier que le vendeur a un token APNs
    if (!secret.user.apnsToken) {
      console.log('[PURCHASE_NOTIFICATION] Le vendeur n\'a pas de token APNs');
      return res.status(200).json({
        success: true,
        message: 'Pas de token de notification pour le vendeur'
      });
    }

    // AJOUT: Gérer le cas du token simulateur pour le vendeur
    if (secret.user.apnsToken === 'SIMULATOR_MOCK_TOKEN') {
      console.log('[PURCHASE_NOTIFICATION] Token simulateur détecté pour le vendeur, skip de l\'envoi');
      return res.status(200).json({
        success: true,
        message: 'Notification simulée (vendeur sur simulateur)',
        simulated: true
      });
    }

    // Récupérer la conversation liée à cet achat
    console.log('[PURCHASE_NOTIFICATION] Recherche de conversation pour:', {
      secretId,
      participants: [secret.user._id, buyerId]
    });

    const conversation = await Conversation.findOne({
      secret: secretId,
      participants: { $all: [secret.user._id, buyerId] }
    });

    if (!conversation) {
      console.error('[PURCHASE_NOTIFICATION] Conversation non trouvée pour:', {
        secretId,
        sellerId: secret.user._id.toString(),
        buyerId
      });
      // Au lieu de retourner une erreur, on peut quand même envoyer la notification
      // mais sans les infos de navigation vers la conversation
      console.log('[PURCHASE_NOTIFICATION] Envoi de la notification sans conversation');
    }

    // Formater le prix
    const formattedPrice = `${price} ${currency}`;

    // Test des traductions avant l'envoi
    const sellerLanguage = secret.user.language || 'fr';
    const testTitle = translate('secretSold', { lng: sellerLanguage });
    const testBody = translate('secretPurchased', {
      lng: sellerLanguage,
      buyerName,
      price: formattedPrice
    });

    console.log('[PURCHASE_NOTIFICATION] Aperçu des traductions:', {
      sellerLanguage,
      title: testTitle,
      body: testBody
    });

    // IMPORTANT: S'assurer d'envoyer au VENDEUR (secret.user._id), pas à l'acheteur
    console.log('[PURCHASE_NOTIFICATION] Envoi de la notification au vendeur:', sellerIdStr);

    // Envoyer la notification avec toutes les données nécessaires
    const notificationResult = await sendPushNotifications(
      [sellerIdStr], // IMPORTANT: Utiliser l'ID du vendeur, pas de l'acheteur
      'secretSold', // Titre: "Secret vendu!" / "Secret sold!"
      {},
      'secretPurchased', // Corps: "{{buyerName}} a acheté votre secret pour {{price}}"
      {
        buyerName,
        price: formattedPrice
      },
      {
        type: 'new_message', // Type pour navigation automatique
        secretId,
        buyerId: buyerIdStr,
        sellerId: sellerIdStr, // Ajouter l'ID du vendeur
        price,
        timestamp: new Date().toISOString(),
        // Données essentielles pour la navigation vers la conversation
        conversationId: conversation ? conversation._id.toString() : null,
        senderId: buyerIdStr,
        senderName: buyerName,
        messagePreview: `${buyerName} a acheté votre secret pour ${formattedPrice}`,
        messageType: 'purchase', // Pour différencier du message normal
        // Données de navigation
        navigationTarget: 'Chat',
        navigationScreen: 'ChatTab',
        navigationParams: conversation ? {
          conversationId: conversation._id.toString(),
          fromPurchaseNotification: true
        } : null,
        // Ajout d'un flag pour identifier clairement que c'est une notification d'achat
        isPurchaseNotification: true,
        isTranslationKey: true // Pour les clés de traduction
      }
    );

    console.log('[PURCHASE_NOTIFICATION] Résultat d\'envoi:', {
      success: notificationResult.success,
      sentCount: notificationResult.results?.sent?.length || 0,
      failedCount: notificationResult.results?.failed?.length || 0,
      targetUserId: sellerIdStr,
      targetUserName: secret.user.name
    });

    res.status(200).json({
      success: true,
      message: 'Notification d\'achat envoyée au vendeur',
      details: notificationResult,
      conversationId: conversation ? conversation._id.toString() : null,
      debug: {
        sellerId: sellerIdStr,
        sellerName: secret.user.name,
        buyerId: buyerIdStr,
        buyerName: buyerName,
        sellerLanguage,
        translatedTitle: testTitle,
        translatedBody: testBody
      }
    });
  } catch (error) {
    console.error('[PURCHASE_NOTIFICATION] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Notification de rappel Stripe avec support multilingue
 */
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
      'stripeReminder',
      {},
      'KEY_stripeReminder',
      {},
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

const cleanupSimulatorTokens = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Vérifier si l'utilisateur a un token simulateur
    const user = await User.findById(userId);
    
    if (user && user.apnsToken === 'SIMULATOR_MOCK_TOKEN') {
      // Supprimer le token simulateur
      await User.findByIdAndUpdate(userId, { $unset: { apnsToken: 1 } });
      
      console.log(`[CLEANUP] Token simulateur supprimé pour l'utilisateur ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Token simulateur supprimé, veuillez réenregistrer votre device'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Pas de token simulateur trouvé'
    });
  } catch (error) {
    console.error('[CLEANUP] Erreur:', error);
    return res.status(500).json({
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
  cleanupSimulatorTokens
};