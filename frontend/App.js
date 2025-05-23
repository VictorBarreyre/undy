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

const Stack = createStackNavigator();

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
            // DrawerNavigator contient TabNavigator sous "Tabs"
            Tabs: {
              screens: {
                ChatTab: {
                  screens: {
                    // ConversationStackNavigator contient ces écrans
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
                  screens: {
                    // Ajoutez ici les écrans de votre HomeStackNavigator si nécessaire
                  },
                },
                Profile: {
                  screens: {
                    // Ajoutez ici les écrans de votre ProfileStackNavigator si nécessaire
                  },
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
  
  // ÉCOUTEUR GLOBAL DE NOTIFICATION - DEBUG ET SOLUTION DE SECOURS
  React.useEffect(() => {
    console.log('[APP] 🔧 Configuration de l\'écouteur global de notifications');
    
    const globalNotificationListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[APP] 🔔 NOTIFICATION GLOBALE INTERCEPTÉE!');
      console.log('[APP] 📱 Données complètes:', JSON.stringify(response.notification.request.content.data, null, 2));
      
      const data = response.notification.request.content.data;
      if (data?.type === 'new_message' && data?.conversationId) {
        console.log('[APP] 🎯 ConversationId détecté:', data.conversationId);
        console.log('[APP] 👤 SenderId:', data.senderId);
        
        // Navigation d'urgence directe
        setTimeout(() => {
          console.log('[APP] 🚨 NAVIGATION D\'URGENCE DEPUIS APP.JS');
          try {
            if (navigationRef.isReady()) {
              console.log('[APP] ✅ NavigationRef prêt, lancement navigation...');
              navigationRef.navigate('MainApp', {
                screen: 'Tabs',
                params: {
                  screen: 'ChatTab',
                  params: {
                    screen: 'Chat',
                    params: { conversationId: data.conversationId },
                  },
                },
              });
              console.log('[APP] 🎉 Navigation d\'urgence réussie!');
            } else {
              console.log('[APP] ❌ NavigationRef pas prêt');
              
              // Essayer de stocker pour plus tard
              try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                AsyncStorage.setItem('EMERGENCY_NAVIGATION', JSON.stringify({
                  type: 'conversation',
                  conversationId: data.conversationId,
                  timestamp: Date.now()
                }));
                console.log('[APP] 💾 Navigation stockée pour plus tard');
              } catch (storageError) {
                console.error('[APP] ❌ Erreur de stockage d\'urgence:', storageError);
              }
            }
          } catch (error) {
            console.error('[APP] ❌ Erreur navigation d\'urgence:', error);
          }
        }, 500);
      } else {
        console.log('[APP] ℹ️ Notification sans données de conversation');
      }
    });
    
    return () => {
      console.log('[APP] 🧹 Nettoyage écouteur global');
      Notifications.removeNotificationSubscription(globalNotificationListener);
    };
  }, []);
  
  React.useEffect(() => {
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
    
    // Activer les gestionnaires après un délai pour s'assurer que NativeBase est initialisé
    const timer = setTimeout(() => {
      setSafeToRenderHandlers(true);
      console.log("[APP] Activation sécurisée des gestionnaires");
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
                  
                  // Vérifier les navigations en attente une fois que NavigationContainer est prêt
                  setTimeout(() => {
                    try {
                      const NavigationService = require('./navigation/NavigationService');
                      if (NavigationService.checkPendingNavigation) {
                        NavigationService.checkPendingNavigation();
                      }
                      console.log("[APP] Services de navigation initialisés avec succès");
                      
                      // Vérifier s'il y a une navigation d'urgence en attente
                      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                      AsyncStorage.getItem('EMERGENCY_NAVIGATION').then(emergencyNavStr => {
                        if (emergencyNavStr) {
                          try {
                            const emergencyNav = JSON.parse(emergencyNavStr);
                            // Ne traiter que les navigations récentes (moins de 2 minutes)
                            if (Date.now() - emergencyNav.timestamp < 120000) {
                              console.log('[APP] 🚨 Navigation d\'urgence trouvée, exécution...');
                              if (emergencyNav.type === 'conversation' && emergencyNav.conversationId) {
                                navigationRef.navigate('MainApp', {
                                  screen: 'Tabs',
                                  params: {
                                    screen: 'ChatTab',
                                    params: {
                                      screen: 'Chat',
                                      params: { conversationId: emergencyNav.conversationId },
                                    },
                                  },
                                });
                                console.log('[APP] 🎉 Navigation d\'urgence exécutée avec succès!');
                              }
                            }
                            // Nettoyer
                            AsyncStorage.removeItem('EMERGENCY_NAVIGATION');
                          } catch (parseError) {
                            console.error('[APP] ❌ Erreur parsing navigation d\'urgence:', parseError);
                          }
                        }
                      });
                      
                    } catch (error) {
                      console.error("[APP] Erreur d'initialisation des services:", error);
                    }
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

// Composant pour le gestionnaire unifié de deep links et notifications
const SafeHandlers = () => {
  const [handlersReady, setHandlersReady] = useState(false);
  
  useEffect(() => {
    try {
      // Délai de sécurité pour l'initialisation
      const timer = setTimeout(() => {
        setHandlersReady(true);
        console.log('[SAFE_HANDLERS] ✅ Gestionnaires prêts à être rendus');
      }, 100);
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error("[SAFE_HANDLERS] Erreur:", error);
      return null;
    }
  }, []);
  
  if (!handlersReady) {
    console.log('[SAFE_HANDLERS] ⏳ Gestionnaires pas encore prêts');
    return null;
  }
  
  try {
    // Importer uniquement le DeepLinkHandler qui gère maintenant tout
    const DeepLinkHandler = require('./presentation/components/DeepLinkHandler').default;
    console.log('[SAFE_HANDLERS] 📦 DeepLinkHandler importé avec succès');
    
    return (
      <View style={{ display: 'none' }}>
        <DeepLinkHandler />
      </View>
    );
  } catch (error) {
    console.error("[SAFE_HANDLERS] ❌ Erreur lors du rendu du gestionnaire:", error);
    return null;
  }
};

export default App;