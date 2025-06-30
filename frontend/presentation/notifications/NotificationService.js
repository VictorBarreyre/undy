import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Fonction pour détecter si on est sur simulateur
const isSimulator = () => {
  return !Constants.isDevice;
};

class NotificationService {
  constructor() {
    this.isConfigured = false;
    this.notificationListeners = [];
    this.removeListeners = [];
    this.processedNotifications = new Set(); // AJOUT: Déduplication des notifications
  }

  // Méthode pour nettoyer les listeners en double
  cleanupDuplicateListeners() {



    // Garder seulement les listeners uniques (par référence de fonction)
    const uniqueListeners = [];
    const seenListeners = new Set();

    this.notificationListeners.forEach((listener) => {
      if (!seenListeners.has(listener)) {
        seenListeners.add(listener);
        uniqueListeners.push(listener);
      }
    });

    this.notificationListeners = uniqueListeners;

  }

  // Initialiser le service
  async initialize() {
    if (this.isConfigured) return true;

    try {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.setApplicationIconBadgeNumber(0);

        // IMPORTANT: Vérifier que les handlers sont définis avant de les ajouter
        if (typeof this.onRemoteNotification === 'function') {
          this.removeListeners.push(
            PushNotificationIOS.addEventListener('notification', this.onRemoteNotification)
          );
        }

        if (typeof this.onLocalNotification === 'function') {
          this.removeListeners.push(
            PushNotificationIOS.addEventListener('localNotification', this.onLocalNotification)
          );
        }

        if (typeof this.onRegistered === 'function') {
          this.removeListeners.push(
            PushNotificationIOS.addEventListener('register', this.onRegistered)
          );
        }

        if (typeof this.onRegistrationError === 'function') {
          this.removeListeners.push(
            PushNotificationIOS.addEventListener('registrationError', this.onRegistrationError)
          );
        }
      }

      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('[NotificationService] Erreur initialisation:', error);
      return false;
    }
  }

  // Demander les permissions et obtenir le token
  async requestPermissions() {
    try {
      if (isSimulator()) {

        return { granted: true, token: 'SIMULATOR_MOCK_TOKEN' };
      }

      if (Platform.OS === 'ios') {
        // Demander les permissions pour iOS
        const permissions = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true
        });



        if (permissions.alert || permissions.badge || permissions.sound) {
          // Attendre que le token soit enregistré
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve({ granted: true, token: null });
            }, 5000);

            // Écouter l'événement d'enregistrement
            const removeListener = PushNotificationIOS.addEventListener('register', (token) => {
              clearTimeout(timeout);
              removeListener();

              resolve({ granted: true, token });
            });

            // Écouter les erreurs
            const removeErrorListener = PushNotificationIOS.addEventListener('registrationError', (error) => {
              clearTimeout(timeout);
              removeListener();
              removeErrorListener();
              console.error('[NotificationService] Erreur enregistrement:', error);
              resolve({ granted: true, token: null });
            });
          });
        }

        return { granted: false, token: null };
      } else {

        return { granted: false, token: null };
      }
    } catch (error) {
      console.error('[NotificationService] Erreur permissions:', error);
      return { granted: false, token: null };
    }
  }

  // Callback quand le token est reçu
  onRegistered = (deviceToken) => {

    AsyncStorage.setItem('apnsToken', deviceToken).catch(console.error);
  };

  // Callback pour les erreurs d'enregistrement
  onRegistrationError = (error) => {
    console.error('[NotificationService] Erreur enregistrement token:', error);
  };

  // Callback pour les notifications reçues - VERSION SÉCURISÉE
  onRemoteNotification = (notification) => {


    // Éviter les appels multiples
    if (notification._remoteNotificationCompleteCallbackCalled) {

      return;
    }

    const isUserInteraction = notification.userInteraction ||
    AppState.currentState !== 'active';




    // Traiter la notification
    if (isUserInteraction) {

      this.handleNotificationOpen(notification);
    } else {

      this.handleForegroundNotification(notification);
    }



    // SOLUTION SÉCURISÉE: Ne pas appeler finish() pour éviter les erreurs
    // Le système iOS gère automatiquement la complétion dans la plupart des cas
    notification._remoteNotificationCompleteCallbackCalled = true;


  };

  // Gérer l'ouverture d'une notification avec déduplication
  handleNotificationOpen = (notification) => {


    let data = null;

    // Extraction des données
    if (notification && notification._data) {
      data = notification._data;
    } else if (notification && notification.data) {
      data = notification.data;
    } else if (notification && typeof notification.getData === 'function') {
      try {
        data = notification.getData();
      } catch (error) {
        console.error('[NotificationService] Erreur getData():', error);
        data = notification._data || notification.data || {};
      }
    } else if (notification && notification.userInfo) {
      data = notification.userInfo;
    } else {
      data = notification || {};
    }

    // AJOUT: Déduplication par notification ID
    const notificationId = data.notificationId || data.id || Date.now().toString();

    if (this.processedNotifications.has(notificationId)) {

      return;
    }

    this.processedNotifications.add(notificationId);

    // Nettoyer après 30 secondes
    setTimeout(() => {
      this.processedNotifications.delete(notificationId);
    }, 30000);




    // Appeler les listeners UNE SEULE FOIS
    this.notificationListeners.forEach((listener, index) => {

      try {
        listener(data);

      } catch (error) {
        console.error(`[NotificationService] ❌ Erreur listener ${index + 1}:`, error);
      }
    });

    // Log spécifique pour le type de notification
    if (data?.type === 'new_message' && data?.conversationId) {






    }
  };

  // Gérer les notifications en foreground
  handleForegroundNotification = (notification) => {
    let data = {};
    let alert = {};

    // Extraire les données et l'alerte
    if (notification._data) {
      data = notification._data;
    }
    if (notification._alert) {
      alert = notification._alert;
    }

    if (alert.title && alert.body) {
      // Afficher une alerte
      Alert.alert(
        alert.title,
        alert.body,
        [
        { text: 'Ignorer', style: 'cancel' },
        {
          text: 'Voir',
          onPress: () => this.handleNotificationOpen(notification)
        }]

      );
    }
  };

  // Ajouter un listener pour les notifications avec déduplication améliorée
  addNotificationListener(callback) {






    // Vérification du callback
    if (typeof callback !== 'function') {
      console.error('[NotificationService] ❌ Le callback n\'est pas une fonction');
      return () => {}; // Retourner une fonction vide pour éviter les erreurs
    }

    // Éviter les doublons en vérifiant la référence ET le contenu
    const callbackString = callback.toString();
    const isDuplicate = this.notificationListeners.some((existingCallback) => {
      return existingCallback === callback || existingCallback.toString() === callbackString;
    });

    if (!isDuplicate) {
      this.notificationListeners.push(callback);

    } else {

    }

    // Nettoyer périodiquement si trop de listeners
    if (this.notificationListeners.length > 3) {

      this.cleanupDuplicateListeners();
    }

    // Retourner une fonction pour retirer le listener
    return () => {

      const index = this.notificationListeners.indexOf(callback);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);

      } else {

      }
    };
  }

  // Obtenir le token stocké
  async getToken() {
    try {
      if (isSimulator()) {
        return 'SIMULATOR_MOCK_TOKEN';
      }

      const token = await AsyncStorage.getItem('apnsToken');
      return token;
    } catch (error) {
      console.error('[NotificationService] Erreur récupération token:', error);
      return null;
    }
  }

  // Envoyer une notification locale
  async sendLocalNotification(title, body, data = {}) {
    try {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.addNotificationRequest({
          id: String(Date.now()),
          title: title,
          body: body,
          userInfo: data,
          sound: 'default'
        });


        return true;
      }
      return false;
    } catch (error) {
      console.error('[NotificationService] Erreur notification locale:', error);
      return false;
    }
  }

  // Obtenir le nombre de badges
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        PushNotificationIOS.getApplicationIconBadgeNumber((num) => {
          resolve(num);
        });
      });
    }
    return 0;
  }

  // Définir le nombre de badges
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
  }

  // Effacer toutes les notifications
  async clearAllNotifications() {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
      await this.setBadgeCount(0);
    }
  }

  // Ajouter une méthode pour la compatibilité
  async checkPermissions() {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        PushNotificationIOS.checkPermissions((permissions) => {
          resolve(permissions.alert || permissions.badge || permissions.sound);
        });
      });
    }
    return false;
  }

  // Méthode pour envoyer une notification de test
  async sendTestNotification() {
    try {
      await this.sendLocalNotification(
        'Test de notification',
        'Les notifications fonctionnent correctement !',
        { type: 'test' }
      );
      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Erreur test notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Nettoyer les listeners
  cleanup() {
    if (Platform.OS === 'ios') {
      // Retirer tous les listeners enregistrés
      this.removeListeners.forEach((remove) => {
        if (typeof remove === 'function') {
          remove();
        }
      });
      this.removeListeners = [];
    }
    this.notificationListeners = [];
    this.processedNotifications.clear(); // Nettoyer les notifications traitées
  }

  // Méthode pour annuler toutes les notifications
  async cancelAllNotifications() {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
      await this.setBadgeCount(0);
    }
  }

  // Méthode pour forcer le nettoyage des listeners (debug)
  forceCleanupListeners() {


    this.notificationListeners = [];
    this.processedNotifications.clear();

  }
}

export default new NotificationService();