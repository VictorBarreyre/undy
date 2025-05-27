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
        
        // Récupérer la notification initiale si l'app a été lancée via notification
        const notification = await PushNotificationIOS.getInitialNotification();
        if (notification) {
          console.log('[NotificationService] Notification initiale:', notification);
          this.handleNotificationOpen(notification);
        }
      }

      this.isConfigured = true;
      console.log('[NotificationService] Service initialisé');
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
        console.log('[NotificationService] Simulateur détecté');
        return { granted: true, token: 'SIMULATOR_MOCK_TOKEN' };
      }

      if (Platform.OS === 'ios') {
        // Demander les permissions pour iOS
        const permissions = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        });

        console.log('[NotificationService] Permissions iOS:', permissions);

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
              console.log('[NotificationService] Token APNs reçu:', token);
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
        console.log('[NotificationService] Android non supporté avec cette librairie');
        return { granted: false, token: null };
      }
    } catch (error) {
      console.error('[NotificationService] Erreur permissions:', error);
      return { granted: false, token: null };
    }
  }

  // Callback quand le token est reçu
  onRegistered = (deviceToken) => {
    console.log('[NotificationService] Token enregistré:', deviceToken);
    AsyncStorage.setItem('apnsToken', deviceToken).catch(console.error);
  }

  // Callback pour les erreurs d'enregistrement
  onRegistrationError = (error) => {
    console.error('[NotificationService] Erreur enregistrement token:', error);
  }

  // Callback pour les notifications reçues
  onRemoteNotification = (notification) => {
    console.log('[NotificationService] Notification reçue:', notification);
    
    // Marquer la notification comme terminée (important pour iOS)
    notification.finish(PushNotificationIOS.FetchResult.NoData);
    
    // Si l'app est en foreground, on peut afficher une alerte ou gérer différemment
    if (AppState.currentState === 'active') {
      this.handleForegroundNotification(notification);
    } else {
      // L'app était en background ou fermée
      this.handleNotificationOpen(notification);
    }
  }

  // Callback pour les notifications locales
  onLocalNotification = (notification) => {
    console.log('[NotificationService] Notification locale reçue:', notification);
    this.handleNotificationOpen(notification);
  }

  // Gérer l'ouverture d'une notification
  handleNotificationOpen = (notification) => {
    const data = notification.getData();
    console.log('[NotificationService] Données de la notification:', data);

    // Notifier les listeners
    this.notificationListeners.forEach(listener => {
      listener(data);
    });

    // Gérer la navigation selon le type
    if (data?.type === 'new_message' && data?.conversationId) {
      // La navigation sera gérée par NotificationHandler
      console.log('[NotificationService] Notification de message, conversationId:', data.conversationId);
    }
  }

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
          }
        ]
      );
    }
  }

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
          sound: 'default',
        });
        
        console.log('[NotificationService] Notification locale programmée');
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