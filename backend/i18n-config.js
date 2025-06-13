/**
 * Configuration i18n pour le backend
 * Gère les traductions multilingues pour les notifications et messages système
 */
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const fs = require('fs');

// Définitions des traductions par défaut (français)
const defaultFrTranslations = {
  "messageFrom": "Message de {{senderName}}",
  "secretSold": "Secret vendu !",
  "secretPurchased": "{{buyerName}} a acheté votre secret pour {{price}}",
  "nearbySecrets": "Secrets à proximité",
  "nearbySecrets_body": "Il y a {{count}} secrets à {{distance}} mètres de vous",
  "stripeReminder": "Configuration bancaire incomplète",
  "stripeReminder_body": "N'oubliez pas de compléter votre configuration bancaire pour recevoir vos paiements",
  "eventNotification": "Événement à durée limitée",
  "eventNotification_body": "{{eventName}} se termine dans {{daysLeft}} jours",
  "statsUpdate": "Mise à jour de vos statistiques",
  "statsUpdate_body": "Vous avez {{secretsCount}} secrets et {{purchasesCount}} achats",
  "welcomeBack": "Bon retour !",
  "welcomeBack_body": "Vous nous avez manqué ! Cela fait {{daysAbsent}} jours que vous n'êtes pas venu",
  "audioMessage": "🎵 Message audio",
  "imageMessage": "📷 Image",
  "videoMessage": "📹 Vidéo", // AJOUT
  "mixedMessage": "📷 Image avec message",
  "newMessage": "Nouveau message", // AJOUT
  // Ajout des clés manquantes pour les notifications de test et erreurs
  "simulatorTestSuccess": "Test de notification simulé avec succès",
  "testNotificationTitle": "Test de Notification",
  "testNotificationBody": "Ceci est une notification de test de votre application",
  "testNotificationSuccess": "Notification de test envoyée avec succès",
  "testNotificationFailure": "Échec de l'envoi de la notification de test",
  "noPushTokenFound": "Aucun token de notification trouvé pour cet utilisateur",
  "errorFindingUserToken": "Erreur lors de la recherche du token de l'utilisateur",
  "serverErrorDuringTest": "Erreur serveur lors du test de notification",
  "apnsProviderNotInitialized": "Le service de notifications APNs n'est pas initialisé",
  "invalidPushToken": "Token de notification invalide",
  "tokenRegisteredSuccess": "Token enregistré avec succès",
  "missingPushToken": "Token de notification manquant",
  "userNotFound": "Utilisateur introuvable",
  "tokenAlreadyRegistered": "Token déjà enregistré",
  "serverError": "Erreur serveur"
};

// Définitions des traductions par défaut (anglais)
const defaultEnTranslations = {
  "messageFrom": "Message from {{senderName}}",
  "secretSold": "Secret sold!",
  "secretPurchased": "{{buyerName}} purchased your secret for {{price}}",
  "nearbySecrets": "Nearby secrets",
  "nearbySecrets_body": "There are {{count}} secrets within {{distance}} meters of you",
  "stripeReminder": "Banking setup incomplete",
  "stripeReminder_body": "Don't forget to complete your banking setup to receive payments",
  "eventNotification": "Limited time event",
  "eventNotification_body": "{{eventName}} ends in {{daysLeft}} days",
  "statsUpdate": "Stats update",
  "statsUpdate_body": "You have {{secretsCount}} secrets and {{purchasesCount}} purchases",
  "welcomeBack": "Welcome back!",
  "welcomeBack_body": "We missed you! It's been {{daysAbsent}} days since your last visit",
  "audioMessage": "🎵 Audio message",
  "imageMessage": "📷 Image",
  "videoMessage": "📹 Video", // AJOUT
  "mixedMessage": "📷 Image with message",
  "newMessage": "New message", // AJOUT
  // Ajout des clés manquantes pour les notifications de test et erreurs
  "simulatorTestSuccess": "Test notification simulated successfully",
  "testNotificationTitle": "Test Notification",
  "testNotificationBody": "This is a test notification from your app",
  "testNotificationSuccess": "Test notification sent successfully",
  "testNotificationFailure": "Failed to send test notification",
  "noPushTokenFound": "No push notification token found for this user",
  "errorFindingUserToken": "Error finding user's notification token",
  "serverErrorDuringTest": "Server error during notification test",
  "apnsProviderNotInitialized": "APNs notification service is not initialized",
  "invalidPushToken": "Invalid push notification token",
  "tokenRegisteredSuccess": "Token registered successfully",
  "missingPushToken": "Push notification token missing",
  "userNotFound": "User not found",
  "tokenAlreadyRegistered": "Token already registered",
  "serverError": "Server error"
};

// S'assurer que les répertoires de localisation existent
const localesPath = path.join(__dirname, 'locales');
try {
  // Créer les répertoires s'ils n'existent pas
  if (!fs.existsSync(localesPath)) {
    fs.mkdirSync(localesPath, { recursive: true });
    console.log('Répertoire de localisations créé:', localesPath);
  }
  
  // Créer les sous-répertoires par langue
  const frPath = path.join(localesPath, 'fr');
  const enPath = path.join(localesPath, 'en');
  
  if (!fs.existsSync(frPath)) {
    fs.mkdirSync(frPath, { recursive: true });
    console.log('Répertoire français créé:', frPath);
  }
  
  if (!fs.existsSync(enPath)) {
    fs.mkdirSync(enPath, { recursive: true });
    console.log('Répertoire anglais créé:', enPath);
  }
  
  // Chemins complets vers les fichiers de traduction
  const frFilePath = path.join(frPath, 'notifications.json');
  const enFilePath = path.join(enPath, 'notifications.json');
  
  // Créer ou mettre à jour les fichiers de traduction
  if (!fs.existsSync(frFilePath)) {
    fs.writeFileSync(frFilePath, JSON.stringify(defaultFrTranslations, null, 2), 'utf8');
    console.log('Fichier de traduction français créé:', frFilePath);
  }
  
  if (!fs.existsSync(enFilePath)) {
    fs.writeFileSync(enFilePath, JSON.stringify(defaultEnTranslations, null, 2), 'utf8');
    console.log('Fichier de traduction anglais créé:', enFilePath);
  }
} catch (error) {
  console.error('Erreur lors de la configuration des répertoires de traduction:', error);
}

// Initialiser i18next avec Backend pour charger depuis des fichiers
i18next
  .use(Backend)
  .init({
    fallbackLng: 'fr',
    ns: ['notifications'],
    defaultNS: 'notifications',
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json')
    },
    interpolation: {
      escapeValue: false
    },
    debug: process.env.NODE_ENV === 'development',
    // Options supplémentaires pour la robustesse
    returnEmptyString: false,
    returnNull: false,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      console.warn(`[i18n] Clé manquante: ${key} (langue: ${lng}, namespace: ${ns})`);
    }
  }, (err, t) => {
    if (err) {
      console.error('Erreur lors de l\'initialisation d\'i18next:', err);
    } else {
      console.log('i18next initialisé avec succès');
    }
  });

/**
 * Fonction utilitaire améliorée pour traduire les textes
 * Gère les cas particuliers et les clés manquantes
 * 
 * @param {string} key - Clé de traduction
 * @param {Object} options - Options de traduction (lng, variables, etc.)
 * @returns {string} - Texte traduit
 */
const translate = (key, options = {}) => {
  try {
    const { lng = 'fr', ...params } = options;
    
    // Si la clé est vide ou null, retourner une chaîne vide
    if (!key) {
      console.warn('Clé de traduction vide');
      return '';
    }
    
    // Normaliser la clé si elle a le préfixe KEY_
    const normalizedKey = key.startsWith('KEY_') ? key.substring(4) : key;
    
    // Si la clé contient des espaces, c'est probablement un texte direct
    if (normalizedKey.includes(' ')) {
      return normalizedKey;
    }
    
    // Première tentative de traduction
    const translated = i18next.t(normalizedKey, { lng, ...params });
    
    // Si la traduction retourne la clé elle-même, essayons avec des variantes
    if (translated === normalizedKey) {
      // Essayer avec le suffixe _body
      const keyWithBody = `${normalizedKey}_body`;
      const bodyTranslation = i18next.t(keyWithBody, { lng, ...params });
      
      // Si traduction avec suffixe trouvée, utiliser celle-ci
      if (bodyTranslation !== keyWithBody) {
        return bodyTranslation;
      }
      
      // Essayer avec la langue par défaut (fr) si ce n'est pas déjà le cas
      if (lng !== 'fr') {
        const defaultLangTranslation = i18next.t(normalizedKey, { lng: 'fr', ...params });
        if (defaultLangTranslation !== normalizedKey) {
          return defaultLangTranslation;
        }
      }
      
      // En dernier recours, utiliser la clé comme texte
      console.warn(`[i18n] Clé non trouvée: ${normalizedKey} (langue: ${lng})`);
      return normalizedKey;
    }
    
    return translated;
  } catch (error) {
    console.error(`[i18n] Erreur de traduction pour la clé "${key}":`, error);
    // En cas d'erreur, retourner la clé pour avoir au moins quelque chose à afficher
    return key;
  }
};

// Exporter les fonctionnalités
module.exports = {
  i18next,
  translate
};