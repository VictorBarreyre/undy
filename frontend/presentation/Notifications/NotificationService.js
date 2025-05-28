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
            const timeout = setTimeout(() => {
              resolve({ granted: true, token: null });
            }, 5000);

            // Écouter l'événement d'enregistrement
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
  
  // Éviter les appels multiples
  if (notification._remoteNotificationCompleteCallbackCalled) {
    console.log('[NotificationService] ⚠️ Notification déjà traitée, skip');
    return;
  }
  
  const isUserInteraction = notification.userInteraction || 
                          (AppState.currentState !== 'active');
  
  console.log('[NotificationService] User interaction:', isUserInteraction);
  console.log('[NotificationService] App state:', AppState.currentState);
  
  // Traiter la notification
  if (isUserInteraction) {
    console.log('[NotificationService] 👆 Traitement comme interaction utilisateur');
    this.handleNotificationOpen(notification);
  } else {
    console.log('[NotificationService] 📱 App active, affichage en foreground');
    this.handleForegroundNotification(notification);
  }
  
  // IMPORTANT: Ne PAS appeler finish() manuellement pour éviter les erreurs natives
  console.log('[NotificationService] ✅ Traitement terminé sans appel finish()');
}

  // Gérer l'ouverture d'une notification
  handleNotificationOpen = (notification) => {
    console.log('[NotificationService] 🎯 handleNotificationOpen appelé');
    
    let data = null;
    
    // CORRECTION: Gérer correctement l'extraction des données
    if (notification && notification._data) {
      data = notification._data;
    } else if (notification && notification.data) {
      data = notification.data;
    } else if (notification && typeof notification.getData === 'function') {
      try {
        data = notification.getData();
      } catch (error) {
        console.error('[NotificationService] Erreur getData():', error);
        // Fallback sur _data
        data = notification._data || notification.data || {};
      }
    } else if (notification && notification.userInfo) {
      data = notification.userInfo;
    } else {
      data = notification || {};
    }
    
    console.log('[NotificationService] 📊 Données extraites:', JSON.stringify(data, null, 2));
    console.log('[NotificationService] 👥 Nombre de listeners:', this.notificationListeners.length);

    // IMPORTANT: Éviter les appels multiples en vérifiant si déjà traité
    const notificationId = data.notificationId || data.id || Date.now().toString();
    if (this.processedNotifications && this.processedNotifications.has(notificationId)) {
      console.log('[NotificationService] ⚠️ Notification déjà traitée:', notificationId);
      return;
    }
    
    if (!this.processedNotifications) {
      this.processedNotifications = new Set();
    }
    this.processedNotifications.add(notificationId);
    
    // Nettoyer les notifications traitées après 1 minute
    setTimeout(() => {
      this.processedNotifications.delete(notificationId);
    }, 60000);

    // Notifier les listeners une seule fois
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
      this.removeListeners.forEach(remove => {
        if (typeof remove === 'function') {
          remove();
        }
      });
      this.removeListeners = [];
    }
    this.notificationListeners = [];
    this.processedNotifications = null;
  }

  // Méthode pour annuler toutes les notifications
  async cancelAllNotifications() {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
      await this.setBadgeCount(0);
    }
  }
}

export default new NotificationService();