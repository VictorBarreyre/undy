import React, { useState, useContext } from "react";
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

const Stack = createStackNavigator();

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

  React.useEffect(() => {
    loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
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
              <NavigationContainer>
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