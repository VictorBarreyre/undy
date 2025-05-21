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
import { Linking, View, Text } from 'react-native';
import { navigationRef } from './navigation/NavigationService';

// Nous allons faire une solution EXTRÊMEMENT prudente
// qui s'assure que NativeBase est complètement initialisé
const Stack = createStackNavigator();

// App sans les gestionnaires potentiellement problématiques
const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [safeToRenderHandlers, setSafeToRenderHandlers] = useState(false);
  
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
  
  React.useEffect(() => {
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
    
    // N'activez les gestionnaires qu'après un délai suffisant pour garantir que NativeBase est initialisé
    const timer = setTimeout(() => {
      setSafeToRenderHandlers(true);
      console.log("[APP] Activation sécurisée des gestionnaires");
    }, 1000); // Délai plus long pour être sûr
    
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
                  // Attendez que NavigationContainer soit prêt puis initialisez
                  setTimeout(() => {
                    try {
                      const NavigationService = require('./navigation/NavigationService');
                      if (NavigationService.checkPendingNavigation) {
                        NavigationService.checkPendingNavigation();
                      }
                      if (NavigationService.setupNotificationDeepLinking) {
                        NavigationService.setupNotificationDeepLinking();
                      }
                      if (NavigationService.checkInitialNotification) {
                        NavigationService.checkInitialNotification();
                      }
                      console.log("[APP] Services de navigation initialisés avec succès");
                    } catch (error) {
                      console.error("[APP] Erreur d'initialisation des services:", error);
                    }
                  }, 500);
                }}
              >
                <StackNavigator />
                
                {/* Charger les gestionnaires uniquement quand c'est sécuritaire */}
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

// Composant séparé pour les gestionnaires problématiques
// Cela garantit qu'ils sont importés uniquement lorsque NativeBase est prêt
const SafeHandlers = () => {
  const [handlersReady, setHandlersReady] = useState(false);
  
  useEffect(() => {
    try {
      // Initialisation des services de notification différée
      const timer = setTimeout(() => {
        setHandlersReady(true);
      }, 100);
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error("[SAFE_HANDLERS] Erreur:", error);
      return null;
    }
  }, []);
  
  if (!handlersReady) return null;
  
  try {
    // Dynamiquement importer les composants problématiques
    const DeepLinkHandler = require('./presentation/components/DeepLinkHandler').default;
    const NotificationHandlerWrapper = require('./presentation/Notifications/NotificationHandlerWrapper').default;
    
    // Essayer de les rendre dans un try/catch pour éviter les crashes
    return (
      <View style={{ display: 'none' }}>
        <DeepLinkHandler />
        <NotificationHandlerWrapper />
      </View>
    );
  } catch (error) {
    console.error("[SAFE_HANDLERS] Erreur lors du rendu des gestionnaires:", error);
    return null;
  }
};

export default App;