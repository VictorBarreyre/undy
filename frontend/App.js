import React, { useState, useEffect, useRef } from "react";
import { NativeBaseProvider } from "native-base";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider, AuthContext } from "./infrastructure/context/AuthContext";
import * as Font from "expo-font";
import { lightTheme } from "./infrastructure/theme/theme";
import { CardDataProvider } from "./infrastructure/context/CardDataContexte";
import TypewriterLoader from "./presentation/components/TypewriterLoader";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import StackNavigator from './navigation/StackNavigator/StackNavigator';
import { StripeProvider } from "@stripe/stripe-react-native";
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import DeepLinkHandler from "./presentation/components/DeepLinkHandler";
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import NotificationManager from "./presentation/Notifications/NotificationManager";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createStackNavigator();

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

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
            ChatTab: {
              screens: {
                Chat: 'chat/:conversationId',
              },
            },
          },
        },
      },
    },
    // Ajout d'un gestionnaire d'erreur pour le debug
    async getInitialURL() {
      // Vérifier s'il y a un URL initial
      const url = await Linking.getInitialURL();
      if (url != null) {
        return url;
      }
      return null;
    },
    subscribe(listener) {
      const onReceiveURL = ({ url }) => listener(url);

      // Écouter les événements quand l'app est ouverte
      const subscription = Linking.addEventListener('url', onReceiveURL);

      return () => {
        subscription.remove();
      };
    },
  };

  const handleNotificationNavigation = (data) => {
    if (!data || !navigationRef.current) return;

    try {
      switch (data.type) {
        case 'new_message':
          if (data.conversationId) {
            navigationRef.current.navigate('MainApp', {
              screen: 'ChatTab',
              params: {
                screen: 'Chat',
                params: { conversationId: data.conversationId }
              }
            });
          }
          break;
        case 'purchase':
          if (data.secretId) {
            navigationRef.current.navigate('SecretDetail', { 
              secretId: data.secretId 
            });
          }
          break;
        case 'nearby_secrets':
          navigationRef.current.navigate('MainApp', {
            screen: 'SearchTab'
          });
          break;
        // Autres cas selon vos besoins
      }
    } catch (error) {
      console.error('Erreur de navigation depuis notification:', error);
    }
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

  // Effet pour configurer les écouteurs de notifications
  useEffect(() => {
    // Configurer les écouteurs pour les notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification);
      // Vous pouvez mettre à jour l'interface utilisateur ici si nécessaire
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Interaction avec notification:', response);
      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

    // Nettoyage lors du démontage
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);



  if (!fontsLoaded) {
    return
    <TypewriterLoader />;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.anonymous.frontend" // Ajout de cette ligne
      urlScheme="frontend"
    >
      <AuthProvider>
        <CardDataProvider>
          <NativeBaseProvider theme={lightTheme}>
            <SafeAreaProvider>
              <NavigationContainer
                linking={linking}
                theme={{
                  colors: {
                    background: 'transparent',
                    card: 'transparent',
                    border: 'transparent',
                  },
                }}
              >
                <StackNavigator />
                <DeepLinkHandler />
              </NavigationContainer>
            </SafeAreaProvider>
          </NativeBaseProvider>
        </CardDataProvider>
      </AuthProvider>
    </StripeProvider>
  );
};


export default App;