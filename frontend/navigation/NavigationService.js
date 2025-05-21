import { createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créer une référence de navigation globale
export const navigationRef = createNavigationContainerRef();

// Fonction pour naviguer depuis n'importe où
export function navigate(name, params) {
  console.log("[NAVIGATION_SERVICE] Tentative de navigation vers:", name, params);
  if (navigationRef.isReady()) {
    console.log("[NAVIGATION_SERVICE] Navigation exécutée");
    navigationRef.navigate(name, params);
  } else {
    console.log("[NAVIGATION_SERVICE] Navigation mise en attente");
    // Stocker la navigation pour l'exécuter plus tard
    AsyncStorage.setItem(
      'PENDING_NAVIGATION',
      JSON.stringify({ name, params, timestamp: Date.now() })
    ).catch(err => console.error('[NAVIGATION_SERVICE] Erreur de stockage de navigation:', err));
  }
}

// Navigation spécifique vers une conversation
export function navigateToConversation(conversationId) {
  console.log("[NAVIGATION_SERVICE] Navigation vers conversation:", conversationId);
  navigate('MainApp', {
    screen: 'ChatTab',
    params: {
      screen: 'Chat',
      params: { conversationId },
    },
  });
}

// Configurer le gestionnaire de notifications pour les deep links
export function setupNotificationDeepLinking() {
  console.log("[NAVIGATION_SERVICE] Configuration du gestionnaire de notifications");
  
  // Configurer les notifications pour qu'elles ouvrent l'app via deep link
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  
  // Ajouter un écouteur pour les clics sur les notifications
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log("[NAVIGATION_SERVICE] Notification cliquée:", data);
    
    // Si c'est une notification de message, naviguer vers la conversation
    if (data?.type === 'new_message' && data?.conversationId) {
      console.log("[NAVIGATION_SERVICE] Notification de message avec conversationId:", data.conversationId);
      // Attendre un petit délai pour que la navigation soit prête
      setTimeout(() => {
        navigateToConversation(data.conversationId);
      }, 500);
    }
  });
  
  return subscription;
}

// Vérifier s'il y a des notifications en attente qui ont ouvert l'app
export async function checkInitialNotification() {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data;
      console.log("[NAVIGATION_SERVICE] Notification initiale trouvée:", data);
      
      if (data?.type === 'new_message' && data?.conversationId) {
        console.log("[NAVIGATION_SERVICE] Navigation initiale vers conversation:", data.conversationId);
        // Attendre un peu plus longtemps pour l'initialisation de l'app
        setTimeout(() => {
          navigateToConversation(data.conversationId);
        }, 1500);
      }
    }
  } catch (error) {
    console.error("[NAVIGATION_SERVICE] Erreur lors de la vérification des notifications:", error);
  }
}

// Vérifier s'il y a des navigations en attente
export async function checkPendingNavigation() {
  if (!navigationRef.isReady()) return;
  
  try {
    const pendingNavStr = await AsyncStorage.getItem('PENDING_NAVIGATION');
    if (pendingNavStr) {
      const pendingNav = JSON.parse(pendingNavStr);
      
      // Ne traiter que les navigations récentes (moins de 30 secondes)
      if (Date.now() - pendingNav.timestamp < 30000) {
        console.log("[NAVIGATION_SERVICE] Exécution d'une navigation en attente:", pendingNav);
        navigate(pendingNav.name, pendingNav.params);
      }
      
      // Nettoyer
      await AsyncStorage.removeItem('PENDING_NAVIGATION');
    }
  } catch (error) {
    console.error("[NAVIGATION_SERVICE] Erreur de vérification des navigations en attente:", error);
  }
}