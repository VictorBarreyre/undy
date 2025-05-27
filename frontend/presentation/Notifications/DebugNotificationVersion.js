// Créez ce fichier temporaire pour vérifier votre configuration
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';

export const debugNotificationAPI = () => {
  console.log('========== DEBUG NOTIFICATION API ==========');
  
  if (Platform.OS === 'ios') {
    // Vérifier les méthodes disponibles
    console.log('PushNotificationIOS type:', typeof PushNotificationIOS);
    console.log('Méthodes disponibles:');
    
    const methods = [
      'addEventListener',
      'removeEventListener',
      'requestPermissions',
      'abandonPermissions',
      'checkPermissions',
      'getInitialNotification',
      'addNotificationListener', // Ceci n'existe probablement pas
      'addNotificationRequest',
      'removeAllDeliveredNotifications',
      'getApplicationIconBadgeNumber',
      'setApplicationIconBadgeNumber',
      'FetchResult'
    ];
    
    methods.forEach(method => {
      console.log(`- ${method}:`, typeof PushNotificationIOS[method]);
    });
    
    // Vérifier les événements supportés
    console.log('\nÉvénements supportés:');
    const events = ['notification', 'localNotification', 'register', 'registrationError'];
    events.forEach(event => {
      console.log(`- ${event}`);
    });
  } else {
    console.log('Platform non-iOS, PushNotificationIOS non disponible');
  }
  
  console.log('========================================');
};

// Appelez cette fonction dans votre App.js temporairement
// debugNotificationAPI();