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

// Navigation spécifique vers une conversation - CORRIGÉE SELON VOTRE STRUCTURE
export function navigateToConversation(conversationId) {
  console.log("[NAVIGATION_SERVICE] Navigation vers conversation:", conversationId);
  
  if (navigationRef.isReady()) {
    try {
      // CORRECTION: Navigation selon votre vraie structure de navigation
      // StackNavigator -> MainApp (DrawerNavigator) -> Tabs (TabNavigator) -> ChatTab (ConversationStackNavigator) -> Chat (ChatScreen)
      console.log("[NAVIGATION_SERVICE] Tentative navigation structure complète");
      
      navigationRef.navigate('MainApp', {
        screen: 'Tabs', // DrawerNavigator contient TabNavigator sous le nom "Tabs"
        params: {
          screen: 'ChatTab', // TabNavigator contient ConversationStackNavigator sous le nom "ChatTab"
          params: {
            screen: 'Chat', // ConversationStackNavigator contient ChatScreen sous le nom "Chat"
            params: { conversationId },
          },
        },
      });
      
      console.log("[NAVIGATION_SERVICE] Navigation réussie (structure complète)");
    } catch (error) {
      console.log("[NAVIGATION_SERVICE] Échec méthode principale, tentative fallback:", error);
      try {
        // Méthode 2: Navigation directe vers l'onglet si la structure complète échoue
        navigationRef.navigate('ChatTab', {
          screen: 'Chat',
          params: { conversationId },
        });
        console.log("[NAVIGATION_SERVICE] Navigation réussie (fallback ChatTab)");
      } catch (fallbackError) {
        console.log("[NAVIGATION_SERVICE] Échec fallback ChatTab, tentative Chat direct:", fallbackError);
        try {
          // Méthode 3: Navigation très directe
          navigationRef.navigate('Chat', { conversationId });
          console.log("[NAVIGATION_SERVICE] Navigation réussie (Chat direct)");
        } catch (lastError) {
          console.error("[NAVIGATION_SERVICE] Toutes les méthodes ont échoué:", lastError);
          
          // Debug: Afficher l'état de navigation actuel
          try {
            const state = navigationRef.getState?.();
            console.log("[NAVIGATION_SERVICE] 🔍 État de navigation actuel:", JSON.stringify(state, null, 2));
          } catch (debugError) {
            console.log("[NAVIGATION_SERVICE] 🔍 Impossible d'obtenir l'état de navigation");
          }
        }
      }
    }
  } else {
    console.log("[NAVIGATION_SERVICE] NavigationContainer pas prêt, stockage pour plus tard");
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

// Fonction utilitaire pour déboguer l'état de navigation
export function debugNavigationState() {
  if (navigationRef.isReady()) {
    try {
      const state = navigationRef.getState();
      console.log("[NAVIGATION_SERVICE] 🔍 État de navigation complet:", JSON.stringify(state, null, 2));
      return state;
    } catch (error) {
      console.error("[NAVIGATION_SERVICE] Erreur lors de la récupération de l'état:", error);
      return null;
    }
  } else {
    console.log("[NAVIGATION_SERVICE] NavigationContainer pas prêt pour le debug");
    return null;
  }
}

// Fonction pour naviguer vers AddSecret (utile pour les retours Stripe)
export function navigateToAddSecret() {
  console.log("[NAVIGATION_SERVICE] Navigation vers AddSecret");
  
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('MainApp', {
        screen: 'Tabs',
        params: {
          screen: 'AddSecret',
        },
      });
      console.log("[NAVIGATION_SERVICE] Navigation vers AddSecret réussie");
    } catch (error) {
      console.error("[NAVIGATION_SERVICE] Erreur navigation vers AddSecret:", error);
      // Fallback
      try {
        navigationRef.navigate('AddSecret');
      } catch (fallbackError) {
        console.error("[NAVIGATION_SERVICE] Fallback AddSecret échoué aussi:", fallbackError);
      }
    }
  } else {
    AsyncStorage.setItem(
      'PENDING_NAVIGATION',
      JSON.stringify({ 
        name: 'AddSecret',
        params: {},
        timestamp: Date.now() 
      })
    ).catch(err => console.error('[NAVIGATION_SERVICE] Erreur de stockage AddSecret:', err));
  }
}