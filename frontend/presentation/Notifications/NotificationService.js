import { createNavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créer une référence de navigation globale
export const navigationRef = createNavigationContainerRef();

// Fonction utilitaire pour naviguer depuis n'importe où
export function navigate(name, params) {
  console.log("[NAVIGATION_SERVICE] Tentative de navigation vers:", name, params);
  if (navigationRef.isReady()) {
    console.log("[NAVIGATION_SERVICE] Navigation exécutée");
    navigationRef.navigate(name, params);
  } else {
    console.log("[NAVIGATION_SERVICE] Navigation mise en attente - NavigationContainer pas prêt");
    // Stocker la navigation pour l'exécuter plus tard
    AsyncStorage.setItem(
      'PENDING_NAVIGATION',
      JSON.stringify({ name, params, timestamp: Date.now() })
    ).catch(err => console.error('[NAVIGATION_SERVICE] Erreur de stockage de navigation:', err));
  }
}

// Navigation spécifique vers une conversation (utilisée par d'autres composants si nécessaire)
export function navigateToConversation(conversationId) {
  console.log("[NAVIGATION_SERVICE] Navigation vers conversation:", conversationId);
  
  if (navigationRef.isReady()) {
    try {
      // Méthode principale
      navigationRef.navigate('MainApp', {
        screen: 'Tabs',
        params: {
          screen: 'ChatTab',
          params: {
            screen: 'Chat',
            params: { conversationId },
          },
        },
      });
      console.log("[NAVIGATION_SERVICE] Navigation réussie");
    } catch (error) {
      console.error("[NAVIGATION_SERVICE] Erreur de navigation:", error);
      // Fallback
      try {
        navigationRef.navigate('Chat', { conversationId });
      } catch (fallbackError) {
        console.error("[NAVIGATION_SERVICE] Fallback échoué aussi:", fallbackError);
      }
    }
  } else {
    console.log("[NAVIGATION_SERVICE] Navigation mise en attente");
    AsyncStorage.setItem(
      'PENDING_NAVIGATION',
      JSON.stringify({ 
        type: 'conversation',
        conversationId, 
        timestamp: Date.now() 
      })
    ).catch(err => console.error('[NAVIGATION_SERVICE] Erreur de stockage:', err));
  }
}

// Vérifier s'il y a des navigations en attente (appelé depuis App.js)
export async function checkPendingNavigation() {
  if (!navigationRef.isReady()) return;
  
  try {
    const pendingNavStr = await AsyncStorage.getItem('PENDING_NAVIGATION');
    if (pendingNavStr) {
      const pendingNav = JSON.parse(pendingNavStr);
      
      // Ne traiter que les navigations récentes (moins de 2 minutes)
      if (Date.now() - pendingNav.timestamp < 120000) {
        console.log("[NAVIGATION_SERVICE] Exécution d'une navigation en attente:", pendingNav);
        
        if (pendingNav.type === 'conversation' && pendingNav.conversationId) {
          navigateToConversation(pendingNav.conversationId);
        } else {
          navigate(pendingNav.name, pendingNav.params);
        }
      }
      
      // Nettoyer
      await AsyncStorage.removeItem('PENDING_NAVIGATION');
    }
  } catch (error) {
    console.error("[NAVIGATION_SERVICE] Erreur de vérification des navigations en attente:", error);
  }
}