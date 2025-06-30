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

// Import des composants
import NotificationHandler from './presentation/notifications/NotificationHandler';
import DeepLinkHandler from './presentation/components/DeepLinkHandler';
import NotificationService from './presentation/notifications/NotificationService';

const Stack = createStackNavigator();

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isNavigationReady, setNavigationReady] = useState(false);

  // Configuration du linking UNIQUEMENT pour les deep links (pas les notifications)
  const linking = {
    prefixes: ['hushy://', 'https://hushy.app'],
    config: {
      screens: {
        // Deep link pour les secrets partagés
        SharedSecret: {
          path: 'secret/:secretId',
          parse: {
            secretId: (secretId) => secretId
          }
        }
        // Vous pouvez ajouter d'autres deep links ici si nécessaire
        // mais PAS pour les notifications - elles sont gérées par NotificationHandler
      }
    }
  };

  const loadFonts = async () => {
    await Font.loadAsync({
      "SF-Pro-Display-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
      "SF-Pro-Display-Medium": require("./assets/fonts/SF-Pro-Display-Medium.otf"),
      "SF-Pro-Display-Semibold": require("./assets/fonts/SF-Pro-Display-Semibold.otf"),
      "SF-Pro-Display-Bold": require("./assets/fonts/SF-Pro-Display-Bold.otf")
    });
  };

  useEffect(() => {
    // Charger les fonts
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);

    // Cleanup au démontage
    return () => {
      if (Platform.OS === 'ios') {
        NotificationService.cleanup();
      }
    };
  }, []);

  if (!fontsLoaded) {
    return <TypewriterLoader />;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.hushy.payments"
      urlScheme="hushy">

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
                    border: 'transparent'
                  }
                }}
                onReady={() => {

                  setNavigationReady(true);
                }}>

                <StackNavigator />
                
                {/* Gestionnaires de notifications et deep links */}
                {/* Ne les monter que quand la navigation est prête */}
                {isNavigationReady &&
                <>
                    <NotificationHandler />
                    <DeepLinkHandler />
                  </>
                }
              </NavigationContainer>
            </SafeAreaProvider>
          </NativeBaseProvider>
        </CardDataProvider>
      </AuthProvider>
    </StripeProvider>);

};

export default App;