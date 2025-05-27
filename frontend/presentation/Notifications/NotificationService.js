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
    console.log('[NotificationService] Type de notification:', typeof notification);
    console.log('[NotificationService] Propriétés:', Object.keys(notification));
    
    // Pour les notifications locales sur simulateur, la structure peut être différente
    let notificationData = notification;
    
    // Si c'est un objet avec une méthode getData
    if (notification && typeof notification.getData === 'function') {
      notificationData = notification.getData();
    } else if (notification && notification.data) {
      notificationData = notification.data;
    }
    
    // Vérifier si c'est une interaction utilisateur
    const isUserInteraction = notification.userInteraction || 
                            (notificationData && notificationData.userInteraction);
    
    console.log('[NotificationService] User interaction:', isUserInteraction);
    console.log('[NotificationService] App state:', AppState.currentState);
    
    // Marquer la notification comme terminée si nécessaire
    if (notification && typeof notification.finish === 'function') {
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    }
    
    // Si c'est une interaction utilisateur ou si l'app n'est pas active
    if (isUserInteraction || AppState.currentState !== 'active') {
      this.handleNotificationOpen({ getData: () => notificationData });
    } else {
      // App en foreground
      this.handleForegroundNotification({ 
        getData: () => notificationData,
        getAlert: () => notification.alert || notification.aps?.alert || {}
      });
    }
  }

  // Callback pour les notifications locales
  onLocalNotification = (notification) => {
    console.log('[NotificationService] Notification locale reçue:', notification);
    console.log('[NotificationService] Structure:', JSON.stringify(notification, null, 2));
    
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
  }

  // Gérer l'ouverture d'une notification
  handleNotificationOpen = (notification) => {
    console.log('[NotificationService] 🎯 handleNotificationOpen appelé');
    console.log('[NotificationService] 📱 Type de notification:', typeof notification);
    console.log('[NotificationService] 📊 Structure:', {
      hasGetData: typeof notification.getData === 'function',
      hasData: !!notification.data,
      hasUserInfo: !!notification.userInfo,
      keys: Object.keys(notification || {})
    });
    
    let data = null;
    
    // Extraire les données selon la structure
    if (notification && typeof notification.getData === 'function') {
      data = notification.getData();
      console.log('[NotificationService] 📊 Données via getData():', data);
    } else if (notification && notification.userInfo) {
      data = notification.userInfo;
      console.log('[NotificationService] 📊 Données via userInfo:', data);
    } else if (notification && notification.data) {
      data = notification.data;
      console.log('[NotificationService] 📊 Données via data:', data);
    } else {
      data = notification;
      console.log('[NotificationService] 📊 Utilisation directe:', data);
    }
    
    console.log('[NotificationService] 📊 Données finales:', JSON.stringify(data, null, 2));
    console.log('[NotificationService] 👥 Nombre de listeners:', this.notificationListeners.length);

    // Notifier les listeners
    this.notificationListeners.forEach((listener, index) => {
      console.log(`[NotificationService] 📣 Appel du listener ${index + 1}/${this.notificationListeners.length}`);
      try {
        listener(data);
        console.log(`[NotificationService] ✅ Listener ${index + 1} exécuté avec succès`);
      } catch (error) {
        console.error(`[NotificationService] ❌ Erreur listener ${index + 1}:`, error);
      }
    });

    // Log spécifique pour le type de notification
    if (data?.type === 'new_message' && data?.conversationId) {
      console.log('[NotificationService] 💬 Notification de message détectée');
      console.log('[NotificationService] 🆔 ConversationId:', data.conversationId);
      console.log('[NotificationService] 👤 SenderId:', data.senderId);
      console.log('[NotificationService] 📝 SenderName:', data.senderName);
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