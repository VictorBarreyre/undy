import React, { useState, useEffect } from "react";
import { NativeBaseProvider } from "native-base";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider } from "./infrastructure/context/AuthContext";
import * as Font from "expo-font";
import { lightTheme } from "./infrastructure/theme/theme";
import { CardDataProvider } from "./infrastructure/context/CardDataContexte";
import TypewriterLoader from "./presentation/components/TypewriterLoader";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StackNavigator from './navigation/StackNavigator/StackNavigator';
import { StripeProvider } from "@stripe/stripe-react-native";
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { Linking, View } from 'react-native';
import { navigationRef } from './navigation/NavigationService';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();

// Configuration globale des notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[APP] 📢 Notification reçue en premier plan');
    const data = notification.request.content.data;
    console.log('[APP] 📋 Données notification foreground:', JSON.stringify(data, null, 2));
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [safeToRenderHandlers, setSafeToRenderHandlers] = useState(false);
  
  // Configuration de deep linking mise à jour pour correspondre à la structure réelle
  const linking = {
    prefixes: ['hushy://', 'https://hushy.app'],
    config: {
      screens: {
        SharedSecret: {
          path: 'secret/:secretId',
          parse: {
            secretId: (secretId) => secretId,
          },
        },
        MainApp: {
          screens: {
            Tabs: {
              screens: {
                ChatTab: {
                  screens: {
                    Conversations: 'conversations',
                    Chat: {
                      path: 'chat/:conversationId',
                      parse: {
                        conversationId: (conversationId) => conversationId,
                      },
                    },
                  },
                },
                HomeTab: {
                  screens: {},
                },
                Profile: {
                  screens: {},
                },
                AddSecret: 'add-secret',
              },
            },
          },
        },
      },
    },
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      if (url != null) {
        return url;
      }
      return null;
    },
    subscribe(listener) {
      const onReceiveURL = ({ url }) => {
        listener(url);
      };
      
      const subscription = Linking.addEventListener('url', onReceiveURL);
      
      return () => {
        subscription.remove();
      };
    },
  };
  
  const loadFonts = async () => {
    await Font.loadAsync({
      "SF-Pro-Display-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
      "SF-Pro-Display-Medium": require("./assets/fonts/SF-Pro-Display-Medium.otf"),
      "SF-Pro-Display-Semibold": require("./assets/fonts/SF-Pro-Display-Semibold.otf"),
      "SF-Pro-Display-Bold": require("./assets/fonts/SF-Pro-Display-Bold.otf"),
    });
  };

  // FONCTION DE NAVIGATION VERS CONVERSATION - CENTRALISÉE
  const navigateToConversation = async (conversationId) => {
    console.log('[APP] 🎯 === NAVIGATION CENTRALISÉE ===');
    console.log('[APP] 🎯 ConversationId:', conversationId);
    console.log('[APP] 🎯 NavigationRef isReady:', navigationRef.isReady());
    
    try {
      if (navigationRef.isReady()) {
        console.log('[APP] ✅ NavigationRef prêt, navigation immédiate');
        
        // Log de l'état avant navigation
        const stateBefore = navigationRef.getState();
        console.log('[APP] 📍 État avant navigation:', JSON.stringify(stateBefore, null, 2));
        
        // Tentative de navigation
        console.log('[APP] 🚀 Appel navigationRef.navigate...');
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
        
        // Vérifier l'état après navigation
        setTimeout(() => {
          try {
            const stateAfter = navigationRef.getState();
            console.log('[APP] 📍 État après navigation:', JSON.stringify(stateAfter, null, 2));
          } catch (error) {
            console.log('[APP] ⚠️ Impossible de vérifier l\'état après navigation:', error);
          }
        }, 1000);
        
        console.log('[APP] 🎉 Navigation réussie !');
        
        // Nettoyer toute navigation en attente
        await AsyncStorage.removeItem('PENDING_CONVERSATION_NAV');
        await AsyncStorage.removeItem('EMERGENCY_NAVIGATION');
        
        return true;
      } else {
        console.log('[APP] ❌ NavigationRef pas prêt, sauvegarde pour plus tard');
        
        // Sauvegarder pour navigation ultérieure
        await AsyncStorage.setItem('PENDING_CONVERSATION_NAV', JSON.stringify({
          conversationId,
          timestamp: Date.now()
        }));
        
        return false;
      }
    } catch (error) {
      console.error('[APP] ❌ Erreur navigation:', error);
      console.error('[APP] Stack trace:', error.stack);
      
      // Log détaillé de l'erreur
      if (error.message) {
        console.error('[APP] Message d\'erreur:', error.message);
      }
      
      return false;
    }
  };

  // GESTIONNAIRE PRINCIPAL DES NOTIFICATIONS - UNIFIÉ
  const handleNotificationClick = async (response) => {
    console.log('[APP] 🔔 === GESTIONNAIRE PRINCIPAL NOTIFICATION ===');
    console.log('[APP] 📱 Response complète:', JSON.stringify(response, null, 2));
    
    // Logs détaillés de la structure
    console.log('[APP] 🔍 === ANALYSE STRUCTURE NOTIFICATION ===');
    console.log('[APP] 1️⃣ response.notification:', response.notification);
    console.log('[APP] 2️⃣ response.notification.request:', response.notification.request);
    console.log('[APP] 3️⃣ response.notification.request.content:', response.notification.request.content);
    console.log('[APP] 4️⃣ response.notification.request.content.data:', response.notification.request.content.data);
    
    // Vérifier tous les endroits possibles où les données pourraient être
    console.log('[APP] 🔎 === RECHERCHE DES DONNÉES ===');
    
    // Cas 1: Dans content.data (standard)
    const content = response.notification.request.content;
    let data = content.data;
    console.log('[APP] 📋 Données dans content.data:', data);
    
    // Cas 2: Directement dans content
    if (!data || !data.type) {
      console.log('[APP] ⚠️ Pas de données dans content.data, recherche dans content...');
      
      // Lister toutes les propriétés de content
      console.log('[APP] 📋 Toutes les propriétés de content:', Object.keys(content));
      
      // Vérifier si les données sont directement dans content
      if (content.conversationId || content.type) {
        console.log('[APP] ✅ Données trouvées directement dans content');
        data = {
          type: content.type || 'new_message',
          conversationId: content.conversationId,
          senderId: content.senderId,
          senderName: content.senderName,
          messageType: content.messageType || 'text',
          timestamp: content.timestamp || new Date().toISOString(),
          navigationTarget: content.navigationTarget,
          navigationScreen: content.navigationScreen,
          navigationParams: content.navigationParams
        };
        console.log('[APP] 📋 Données reconstruites:', data);
      }
    }
    
    // Cas 3: Dans le payload original (APNs)
    if (!data || !data.type) {
      console.log('[APP] ⚠️ Toujours pas de données, recherche dans payload...');
      
      // Pour APNs, les données peuvent être dans request.trigger.payload
      if (response.notification.request.trigger && response.notification.request.trigger.payload) {
        console.log('[APP] 📋 Payload trouvé dans trigger:', response.notification.request.trigger.payload);
        const payload = response.notification.request.trigger.payload;
        
        // Les données personnalisées APNs sont au niveau racine du payload
        data = {
          type: payload.type || 'new_message',
          conversationId: payload.conversationId,
          senderId: payload.senderId,
          senderName: payload.senderName,
          messageType: payload.messageType || 'text',
          timestamp: payload.timestamp || new Date().toISOString(),
          navigationTarget: payload.navigationTarget,
          navigationScreen: payload.navigationScreen,
          navigationParams: payload.navigationParams
        };
        console.log('[APP] 📋 Données extraites du payload APNs:', data);
      }
    }
    
    // Cas 4: Dans identifier (certaines versions)
    if (!data || !data.type) {
      console.log('[APP] ⚠️ Recherche dans identifier...');
      if (response.notification.request.identifier) {
        console.log('[APP] 📋 Identifier:', response.notification.request.identifier);
      }
    }
    
    console.log('[APP] 📋 === DONNÉES FINALES ===');
    console.log('[APP] 📋 Données finales extraites:', JSON.stringify(data, null, 2));
    
    // Validation des données
    if (data?.type === 'new_message' && data?.conversationId) {
      console.log('[APP] ✅ Notification de message valide détectée');
      console.log('[APP] 🎯 ConversationId:', data.conversationId);
      console.log('[APP] 👤 SenderId:', data.senderId);
      console.log('[APP] 👤 SenderName:', data.senderName);
      
      // Vérifier l'état de navigation avant de naviguer
      console.log('[APP] 🔍 === ÉTAT DE NAVIGATION ===');
      console.log('[APP] NavigationRef isReady:', navigationRef.isReady());
      
      if (navigationRef.isReady()) {
        console.log('[APP] ✅ NavigationRef prêt');
        
        // Obtenir l'état actuel de navigation
        try {
          const currentState = navigationRef.getState();
          console.log('[APP] 📍 État navigation actuel:', JSON.stringify(currentState, null, 2));
        } catch (error) {
          console.log('[APP] ⚠️ Impossible d\'obtenir l\'état de navigation:', error);
        }
        
        // Navigation avec délai pour s'assurer que l'app est prête
        setTimeout(async () => {
          console.log('[APP] 🚀 Tentative de navigation vers:', data.conversationId);
          
          try {
            const success = await navigateToConversation(data.conversationId);
            if (success) {
              console.log('[APP] 🎉 Navigation notification réussie !');
            } else {
              console.log('[APP] ⏳ Navigation sauvegardée pour plus tard');
            }
          } catch (error) {
            console.log('[APP] ❌ Erreur lors de la navigation:', error);
            console.log('[APP] Stack trace:', error.stack);
          }
        }, 500);
        
      } else {
        console.log('[APP] ❌ NavigationRef pas prêt, sauvegarde pour plus tard');
        
        // Sauvegarder pour navigation ultérieure
        try {
          await AsyncStorage.setItem('PENDING_CONVERSATION_NAV', JSON.stringify({
            conversationId: data.conversationId,
            timestamp: Date.now(),
            data: data // Sauvegarder toutes les données pour debug
          }));
          console.log('[APP] 💾 Navigation sauvegardée dans AsyncStorage');
        } catch (error) {
          console.log('[APP] ❌ Erreur sauvegarde AsyncStorage:', error);
        }
      }
      
    } else {
      console.log('[APP] ❌ Notification ignorée - données invalides');
      console.log('[APP] 🔍 Type:', data?.type);
      console.log('[APP] 🔍 ConversationId:', data?.conversationId);
      console.log('[APP] 🔍 Données complètes:', JSON.stringify(data, null, 2));
    }
  };

  // VÉRIFICATION DES NAVIGATIONS EN ATTENTE
  const checkPendingNavigations = async () => {
    console.log('[APP] 🔍 Vérification des navigations en attente...');
    
    try {
      // Vérifier PENDING_CONVERSATION_NAV
      const pendingNavStr = await AsyncStorage.getItem('PENDING_CONVERSATION_NAV');
      if (pendingNavStr) {
        const pendingNav = JSON.parse(pendingNavStr);
        
        // Ne traiter que les navigations récentes (moins de 5 minutes)
        if (Date.now() - pendingNav.timestamp < 5 * 60 * 1000) {
          console.log('[APP] 🔄 Navigation en attente trouvée:', pendingNav.conversationId);
          
          setTimeout(async () => {
            const success = await navigateToConversation(pendingNav.conversationId);
            if (success) {
              console.log('[APP] ✅ Navigation en attente exécutée avec succès');
            }
          }, 1000);
        } else {
          console.log('[APP] 🧹 Navigation en attente expirée, nettoyage');
          await AsyncStorage.removeItem('PENDING_CONVERSATION_NAV');
        }
      }
      
      // Vérifier EMERGENCY_NAVIGATION
      const emergencyNavStr = await AsyncStorage.getItem('EMERGENCY_NAVIGATION');
      if (emergencyNavStr) {
        const emergencyNav = JSON.parse(emergencyNavStr);
        
        if (Date.now() - emergencyNav.timestamp < 5 * 60 * 1000) {
          console.log('[APP] 🚨 Navigation d\'urgence trouvée:', emergencyNav.conversationId);
          
          setTimeout(async () => {
            if (emergencyNav.type === 'conversation') {
              const success = await navigateToConversation(emergencyNav.conversationId);
              if (success) {
                console.log('[APP] ✅ Navigation d\'urgence exécutée');
              }
            }
          }, 1500);
        } else {
          await AsyncStorage.removeItem('EMERGENCY_NAVIGATION');
        }
      }
      
    } catch (error) {
      console.error('[APP] ❌ Erreur vérification navigations:', error);
    }
  };

  // ÉCOUTEUR GLOBAL DE NOTIFICATION - SIMPLIFIÉ ET CORRECT
  useEffect(() => {
    console.log('[APP] 🎧 Configuration de l\'écouteur global de notifications');
    
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationClick);
    
    return () => {
      console.log('[APP] 🧹 Nettoyage écouteur global');
      Notifications.removeNotificationSubscription(notificationSubscription);
    };
  }, []);
  
  useEffect(() => {
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
    
    // Activer les gestionnaires après un délai
    const timer = setTimeout(() => {
      setSafeToRenderHandlers(true);
      console.log("[APP] ✅ Activation sécurisée des gestionnaires");
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!fontsLoaded) {
    return <TypewriterLoader />;
  }
  
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.hushy.payments"
      urlScheme="hushy"
    >
      <AuthProvider>
        <CardDataProvider>
          <NativeBaseProvider theme={lightTheme}>
            <SafeAreaProvider>
              <NavigationContainer
                ref={navigationRef}
                linking={linking}
                theme={{
                  colors: {
                    background: 'transparent',
                    card: 'transparent',
                    border: 'transparent',
                  },
                }}
                onReady={() => {
                  console.log('[APP] 🚀 NavigationContainer prêt!');
                  
                  // Vérifier les navigations en attente une fois prêt
                  setTimeout(() => {
                    checkPendingNavigations();
                  }, 500);
                }}
              >
                <StackNavigator />
                
                {/* Charger le gestionnaire unifié uniquement quand c'est sécuritaire */}
                {safeToRenderHandlers && (
                  <SafeHandlers />
                )}
              </NavigationContainer>
            </SafeAreaProvider>
          </NativeBaseProvider>
        </CardDataProvider>
      </AuthProvider>
    </StripeProvider>
  );
};

// Composant pour le gestionnaire unifié de deep links
const SafeHandlers = () => {
  const [handlersReady, setHandlersReady] = useState(false);
  
  useEffect(() => {
    try {
      const timer = setTimeout(() => {
        setHandlersReady(true);
        console.log('[SAFE_HANDLERS] ✅ Gestionnaires prêts');
      }, 100);
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error("[SAFE_HANDLERS] Erreur:", error);
      return null;
    }
  }, []);
  
  if (!handlersReady) {
    return null;
  }
  
  try {
    const DeepLinkHandler = require('./presentation/components/DeepLinkHandler').default;
    console.log('[SAFE_HANDLERS] 📦 DeepLinkHandler importé');
    
    return (
      <View style={{ display: 'none' }}>
        <DeepLinkHandler />
      </View>
    );
  } catch (error) {
    console.error("[SAFE_HANDLERS] ❌ Erreur rendu gestionnaire:", error);
    return null;
  }
};

export default App;