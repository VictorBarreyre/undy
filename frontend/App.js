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

// Configurer le gestionnaire de notifications pour l'application
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createStackNavigator();

const AppContent = () => {
  const { userData } = React.useContext(AuthContext);
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigationRef = useRef();

  // Fonction pour gérer la navigation suite à une interaction avec une notification
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
        case 'stripe_setup_reminder':
          navigationRef.current.navigate('StripeSetup');
          break;
        case 'payout':
          navigationRef.current.navigate('MainApp', {
            screen: 'ProfileTab',
            params: { screen: 'Earnings' }
          });
          break;
        // Ajoutez d'autres cas selon vos besoins
      }
    } catch (error) {
      console.error('Erreur de navigation depuis notification:', error);
    }
  };

  // Initialiser le gestionnaire de notifications
  useEffect(() => {
    if (userData) {
      NotificationManager.initialize(userData)
        .then(success => {
          console.log('Notifications initialisées:', success);
        })
        .catch(error => {
          console.error('Erreur initialisation notifications:', error);
        });
    }

    // Configurer les écouteurs de notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification);
      // Vous pouvez ajouter ici une logique pour mettre à jour l'état de l'application
      // par exemple, rafraîchir les compteurs de messages non lus
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
  }, [userData]);

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
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      return url || null;
    },
    subscribe(listener) {
      const onReceiveURL = ({ url }) => listener(url);
      const subscription = Linking.addEventListener('url', onReceiveURL);
      return () => subscription.remove();
    },
  };

  return (
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
    >
      <StackNavigator />
      <DeepLinkHandler />
    </NavigationContainer>
  );
};

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
      merchantIdentifier="merchant.com.anonymous.frontend"
      urlScheme="frontend"
    >
      <AuthProvider>
        <CardDataProvider>
          <NativeBaseProvider theme={lightTheme}>
            <SafeAreaProvider>
              <AppContent />
            </SafeAreaProvider>
          </NativeBaseProvider>
        </CardDataProvider>
      </AuthProvider>
    </StripeProvider>
  );
};

export default App;