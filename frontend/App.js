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
import { Linking } from 'react-native';
import { navigationRef } from './navigation/NavigationService';
import * as Notifications from 'expo-notifications';

// Import des nouveaux composants
import NotificationHandler from './presentation/Notifications/NotificationHandler';
import DeepLinkHandler from './presentation/components/DeepLinkHandler';

const Stack = createStackNavigator();

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isNavigationReady, setNavigationReady] = useState(false);

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
      // Vérifier d'abord s'il y a une notification
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response?.notification?.request?.content?.data?.conversationId) {
        const conversationId = response.notification.request.content.data.conversationId;
        console.log('[APP] Navigation depuis notification:', conversationId);
        return `hushy://chat/${conversationId}`;
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

      // Écouter les clics sur notifications
      const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.conversationId && data?.type === 'new_message') {
          const url = `hushy://chat/${data.conversationId}`;
          console.log('[APP] Navigation depuis notification vers:', url);
          listener(url);
        }
      });

      return () => {
        linkingSubscription.remove();
        notificationSubscription.remove();
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
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
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
                  console.log('[APP] Navigation prête');
                  setNavigationReady(true);
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