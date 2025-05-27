import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

class NotificationService {
  constructor() {
    this.isConfigured = false;
  }

  // Initialiser le service
  async initialize() {
    if (this.isConfigured) return true;

    try {
      // Configuration du canal Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.isConfigured = true;
      console.log('[NotificationService] Service initialisé');
      return true;
    } catch (error) {
      console.error('[NotificationService] Erreur initialisation:', error);
      return false;
    }
  }

  // Demander les permissions
  async requestPermissions() {
    try {
      if (!Device.isDevice) {
        console.log('[NotificationService] Simulateur détecté - permissions simulées');
        return { granted: false, token: null };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Permissions refusées');
        return { granted: false, token: null };
      }

      // Obtenir le token
      const token = await this.getToken();
      
      return { granted: true, token };
    } catch (error) {
      console.error('[NotificationService] Erreur permissions:', error);
      return { granted: false, token: null };
    }
  }

  // Obtenir le token APNs
  async getToken() {
    try {
      if (!Device.isDevice) {
        return 'SIMULATOR_TOKEN';
      }

      // Pour iOS, obtenir le token APNs natif
      if (Platform.OS === 'ios') {
        const token = await Notifications.getDevicePushTokenAsync();
        console.log('[NotificationService] Token APNs obtenu:', token.data);
        return token.data;
      } else {
        // Pour Android, utiliser le token Expo
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig.extra.eas.projectId,
        });
        console.log('[NotificationService] Token Expo obtenu:', token.data);
        return token.data;
      }
    } catch (error) {
      console.error('[NotificationService] Erreur obtention token:', error);
      return null;
    }
  }

  // Envoyer une notification locale (pour les tests)
  async sendLocalNotification(title, body, data = {}) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Immédiat
      });
      
      console.log('[NotificationService] Notification locale envoyée:', id);
      return id;
    } catch (error) {
      console.error('[NotificationService] Erreur notification locale:', error);
      return null;
    }
  }

  // Obtenir le nombre de notifications non lues
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  // Définir le badge
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  // Effacer toutes les notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }
}

export default new NotificationService();