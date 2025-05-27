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
import { Linking, Platform } from 'react-native';
import { navigationRef } from './navigation/NavigationService';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

// Import des nouveaux composants
import NotificationHandler from './presentation/notifications/NotificationHandler';
import DeepLinkHandler from './presentation/components/DeepLinkHandler';
import NotificationService from './presentation/notifications/NotificationService';

const Stack = createStackNavigator();

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isNavigationReady, setNavigationReady] = useState(false);
  const [initialNotification, setInitialNotification] = useState(null);

  // Configuration du linking avec support des notifications
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
                    Chat: {
                      path: 'chat/:conversationId',
                      parse: {
                        conversationId: (conversationId) => conversationId,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Gestion personnalisée de l'URL initiale
    async getInitialURL() {
      // Vérifier d'abord s'il y a une notification initiale (iOS)
      if (Platform.OS === 'ios' && initialNotification) {
        const data = initialNotification.getData();
        if (data?.conversationId && data?.type === 'new_message') {
          console.log('[APP] Navigation depuis notification initiale:', data.conversationId);
          return `hushy://chat/${data.conversationId}`;
        }
      }

      // Sinon vérifier les deep links classiques
      const url = await Linking.getInitialURL();
      if (url != null) {
        console.log('[APP] Deep link initial:', url);
        return url;
      }
      
      return null;
    },
    // S'abonner aux changements d'URL
    subscribe(listener) {
      // Écouter les deep links
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        console.log('[APP] Deep link reçu:', url);
        listener(url);
      });

      // Pour iOS, les notifications sont gérées par NotificationService
      // qui notifiera NotificationHandler directement

      return () => {
        linkingSubscription.remove();
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

  useEffect(() => {
    // Charger les fonts
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);

    // Pour iOS, récupérer la notification initiale si l'app a été lancée via notification
    if (Platform.OS === 'ios') {
      console.log('[APP] 🔍 Vérification notification initiale iOS...');
      
      PushNotificationIOS.getInitialNotification()
        .then(notification => {
          if (notification) {
            console.log('[APP] 📱 Notification initiale détectée:', notification);
            console.log('[APP] 📱 Structure:', {
              hasUserInfo: !!notification.userInfo,
              hasData: !!notification.data,
              keys: Object.keys(notification)
            });
            setInitialNotification(notification);
          } else {
            console.log('[APP] ℹ️ Pas de notification initiale');
          }
        })
        .catch(err => console.error('[APP] ❌ Erreur récupération notification initiale:', err));
        
      // Ajouter un listener de secours pour les notifications
      const notificationListener = (notification) => {
        console.log('[APP] 🔔 Notification reçue (listener de secours):', notification);
        
        if (notification && isNavigationReady) {
          let data = null;
          
          // Extraire les données
          if (notification.userInfo) {
            data = notification.userInfo;
          } else if (notification.data) {
            data = notification.data;
          } else if (typeof notification.getData === 'function') {
            data = notification.getData();
          }
          
          if (data && data.type === 'new_message' && data.conversationId) {
            console.log('[APP] 🚀 Navigation de secours vers conversation:', data.conversationId);
            
            // Délai pour s'assurer que tout est prêt
            setTimeout(() => {
              if (navigationRef.current) {
                try {
                  navigationRef.current.navigate('MainApp', {
                    screen: 'Tabs',
                    params: {
                      screen: 'ChatTab',
                      params: {
                        screen: 'Chat',
                        params: {
                          conversationId: data.conversationId,
                        },
                      },
                    },
                  });
                  console.log('[APP] ✅ Navigation de secours réussie');
                } catch (error) {
                  console.error('[APP] ❌ Erreur navigation de secours:', error);
                }
              }
            }, 500);
          }
        }
      };
      
      // Écouter les événements de notification locale
      PushNotificationIOS.addEventListener('localNotification', notificationListener);
      
      return () => {
        PushNotificationIOS.removeEventListener('localNotification', notificationListener);
      };
    }

    // Cleanup
    return () => {
      if (Platform.OS === 'ios') {
        NotificationService.cleanup();
      }
    };
  }, [isNavigationReady]); // Ajouter isNavigationReady aux dépendances

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
                  console.log('[APP] ✅ Navigation prête');
                  setNavigationReady(true);
                  
                  // Si on avait une notification initiale, la traiter maintenant
                  if (Platform.OS === 'ios' && initialNotification) {
                    console.log('[APP] 📱 Traitement de la notification initiale...');
                    
                    let data = null;
                    if (initialNotification.userInfo) {
                      data = initialNotification.userInfo;
                    } else if (initialNotification.data) {
                      data = initialNotification.data;
                    } else if (typeof initialNotification.getData === 'function') {
                      data = initialNotification.getData();
                    }
                    
                    if (data && data.type === 'new_message' && data.conversationId) {
                      console.log('[APP] 🚀 Navigation immédiate vers:', data.conversationId);
                      
                      // Navigation immédiate
                      setTimeout(() => {
                        navigationRef.current?.navigate('MainApp', {
                          screen: 'Tabs',
                          params: {
                            screen: 'ChatTab',
                            params: {
                              screen: 'Chat',
                              params: {
                                conversationId: data.conversationId,
                              },
                            },
                          },
                        });
                      }, 100);
                    }
                    
                    // Passer aussi au NotificationService
                    if (NotificationService.handleNotificationOpen) {
                      NotificationService.handleNotificationOpen(initialNotification);
                    }
                  }
                }}
              >
                <StackNavigator />
                
                {/* Gestionnaires de notifications et deep links */}
                {isNavigationReady && (
                  <>
                    <NotificationHandler />
                    <DeepLinkHandler />
                  </>
                )}
              </NavigationContainer>
            </SafeAreaProvider>
          </NativeBaseProvider>
        </CardDataProvider>
      </AuthProvider>
    </StripeProvider>
  );
};

export default App;