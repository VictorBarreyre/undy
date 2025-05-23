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
      // Méthode 1: Navigation complète via la structure réelle
      navigationRef.navigate('MainApp', {
        screen: 'Tabs', // DrawerNavigator contient TabNavigator sous "Tabs"
        params: {
          screen: 'ChatTab', // TabNavigator contient ConversationStackNavigator sous "ChatTab"
          params: {
            screen: 'Chat', // ConversationStackNavigator contient ChatScreen sous "Chat"
            params: { conversationId },
          },
        },
      });
      console.log("[NAVIGATION_SERVICE] Navigation réussie (structure complète)");
    } catch (error) {
      console.log("[NAVIGATION_SERVICE] Échec méthode 1, tentative fallback:", error);
      try {
        // Méthode 2: Navigation directe vers l'onglet
        navigationRef.navigate('ChatTab', {
          screen: 'Chat',
          params: { conversationId },
        });
        console.log("[NAVIGATION_SERVICE] Navigation réussie (fallback)");
      } catch (fallbackError) {
        console.error("[NAVIGATION_SERVICE] Toutes les méthodes ont échoué:", fallbackError);
        // Dernière tentative très directe
        try {
          navigationRef.navigate('Chat', { conversationId });
        } catch (lastError) {
          console.error("[NAVIGATION_SERVICE] Dernière tentative échouée:", lastError);
        }
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
  if (!navigationRef.isReady()) {
    console.log("[NAVIGATION_SERVICE] NavigationContainer pas encore prêt");
    return;
  }
  
  try {
    const pendingNavStr = await AsyncStorage.getItem('PENDING_NAVIGATION');
    if (pendingNavStr) {
      const pendingNav = JSON.parse(pendingNavStr);
      
      // Ne traiter que les navigations récentes (moins de 2 minutes)
      if (Date.now() - pendingNav.timestamp < 120000) {
        console.log("[NAVIGATION_SERVICE] Exécution d'une navigation en attente:", pendingNav);
        
        if (pendingNav.type === 'conversation' && pendingNav.conversationId) {
          navigateToConversation(pendingNav.conversationId);
        } else if (pendingNav.name && pendingNav.params) {
          navigate(pendingNav.name, pendingNav.params);
        }
      } else {
        console.log("[NAVIGATION_SERVICE] Navigation en attente trop ancienne, ignorée");
      }
      
      // Nettoyer
      await AsyncStorage.removeItem('PENDING_NAVIGATION');
    }
  } catch (error) {
    console.error("[NAVIGATION_SERVICE] Erreur de vérification des navigations en attente:", error);
  }
}