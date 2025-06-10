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
  }

  // Initialiser le service
  async initialize() {
    if (this.isConfigured) return true;

    try {
      if (Platform.OS === 'ios') {
        // Configuration iOS avec push-notification-ios
        PushNotificationIOS.setApplicationIconBadgeNumber(0);

        // Écouter les notifications reçues en foreground
        PushNotificationIOS.addEventListener('notification', this.onRemoteNotification);

        // Écouter les notifications locales
        PushNotificationIOS.addEventListener('localNotification', this.onLocalNotification);

        // Écouter l'enregistrement du token
        PushNotificationIOS.addEventListener('register', this.onRegistered);

        // Écouter les erreurs d'enregistrement
        PushNotificationIOS.addEventListener('registrationError', this.onRegistrationError);

        // IMPORTANT: Écouter aussi remoteNotificationReceived pour les clics
        PushNotificationIOS.addEventListener('remoteNotificationReceived', this.onRemoteNotification);

        // Récupérer la notification initiale si l'app a été lancée via notification
        const notification = await PushNotificationIOS.getInitialNotification();
        if (notification) {

          // Traiter comme une interaction utilisateur car l'app a été lancée via notification
          setTimeout(() => this.handleNotificationOpen(notification), 1000);
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
            // Timeout au cas où le token ne viendrait pas
            const timeout = setTimeout(() => {
              resolve({ granted: true, token: null });
            }, 5000);

            // Écouter l'événement d'enregistrement une seule fois
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
        // Pour Android, garder la logique expo-notifications

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

  // Callback pour les notifications reçues
  onRemoteNotification = (notification) => {




    // Pour les notifications remote, vérifier si c'est une interaction utilisateur
    const isUserInteraction = notification._data?.userInteraction ||
    notification._userInteraction ||
    notification.userInteraction ||
    false;




    // Marquer la notification comme terminée
    if (notification && typeof notification.finish === 'function') {
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    }

    // IMPORTANT: Traiter comme une interaction si l'app n'est pas active
    // Car cela signifie que l'utilisateur a cliqué sur la notification
    if (AppState.currentState !== 'active' || isUserInteraction) {

      this.handleNotificationOpen(notification);
    } else {

      this.handleForegroundNotification(notification);
    }
  };

  // Callback pour les notifications locales
  onLocalNotification = (notification) => {



    // Pour les notifications locales, la structure peut être directement l'objet de données
    const data = notification.userInfo || notification;

    // Créer un objet compatible avec notre handler
    const notificationWrapper = {
      getData: () => data,
      getAlert: () => ({
        title: notification.alertTitle || notification.title || data.aps?.alert?.title,
        body: notification.alertBody || notification.body || data.aps?.alert?.body
      })
    };

    // Toujours considérer les notifications locales comme des interactions utilisateur
    this.handleNotificationOpen(notificationWrapper);
  };

  // Gérer l'ouverture d'une notification
  handleNotificationOpen = (notification) => {









    let data = null;

    // Extraire les données selon la structure
    if (notification && typeof notification.getData === 'function') {
      data = notification.getData();

    } else if (notification && notification.userInfo) {
      data = notification.userInfo;

    } else if (notification && notification.data) {
      data = notification.data;

    } else {
      data = notification;

    }




    // Notifier les listeners
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
    const data = notification.getData();
    const alert = notification.getAlert();

    if (alert?.title && alert?.body) {
      // Afficher une alerte ou un toast custom
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

  // Ajouter un listener pour les notifications
  addNotificationListener(callback) {
    this.notificationListeners.push(callback);

    // Retourner une fonction pour retirer le listener
    return () => {
      const index = this.notificationListeners.indexOf(callback);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
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

  // Ajouter une méthode pour la compatibilité avec votre code existant
  async checkPermissions() {
    if (Platform.OS === 'ios') {
      const settings = await PushNotificationIOS.checkPermissions();
      return settings.alert || settings.badge || settings.sound;
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
      PushNotificationIOS.removeEventListener('notification');
      PushNotificationIOS.removeEventListener('localNotification');
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('registrationError');
    }
    this.notificationListeners = [];
  }

  // Méthode pour annuler toutes les notifications (compatibilité)
  async cancelAllNotifications() {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
      await this.setBadgeCount(0);
    }
  }
}

export default new NotificationService();