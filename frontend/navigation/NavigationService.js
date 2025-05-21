// NavigationService.js - Créer ce nouveau fichier dans votre projet

import { createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créer une référence de navigation globale
export const navigationRef = createNavigationContainerRef();

// Fonction pour naviguer depuis n'importe où
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    // Stocker la navigation pour l'exécuter plus tard
    AsyncStorage.setItem(
      'PENDING_NAVIGATION',
      JSON.stringify({ name, params, timestamp: Date.now() })
    ).catch(err => console.error('Erreur de stockage de navigation:', err));
  }
}

// Configurer le gestionnaire de notifications pour les deep links
export function setupNotificationDeepLinking() {
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
    console.log("[NAVIGATION_SERVICE] Notification reçue:", data);
    
    // Si c'est une notification de message, naviguer vers la conversation
    if (data?.type === 'new_message' && data?.conversationId) {
      setTimeout(() => {
        navigate('MainApp', {
          screen: 'ChatTab',
          params: {
            screen: 'Chat',
            params: { conversationId: data.conversationId }
          }
        });
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
      console.log("[NAVIGATION_SERVICE] Notification initiale:", data);
      
      if (data?.type === 'new_message' && data?.conversationId) {
        // Attendre un peu que la navigation soit prête
        setTimeout(() => {
          navigate('MainApp', {
            screen: 'ChatTab',
            params: {
              screen: 'Chat',
              params: { conversationId: data.conversationId }
            }
          });
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
      
      // Ne traiter que les navigations récentes
      if (Date.now() - pendingNav.timestamp < 30000) {
        navigate(pendingNav.name, pendingNav.params);
      }
      
      // Nettoyer
      await AsyncStorage.removeItem('PENDING_NAVIGATION');
    }
  } catch (error) {
    console.error("[NAVIGATION_SERVICE] Erreur de vérification des navigations en attente:", error);
  }
}