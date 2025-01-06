import React, { useState, useContext } from "react";
import { NativeBaseProvider } from "native-base";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider, AuthContext } from "./infrastructure/context/AuthContext";
import { useCardData } from "./infrastructure/context/CardDataContexte"
import Register from "./presentation/screens/Register";
import Inscription from "./presentation/screens/Inscription";
import Connexion from "./presentation/screens/Connexion";
import DrawerNavigator from "./navigation/Layout";
import * as Font from "expo-font";
import { lightTheme } from "./infrastructure/theme/theme";
import { CardDataProvider } from "./infrastructure/context/CardDataContexte";
import TypewriterLoader from "./presentation/components/TypewriterLoader";

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
    return <TypewriterLoader />;
  }

  return (
    <AuthProvider>
      <CardDataProvider>
        <NativeBaseProvider theme={lightTheme}>
          <NavigationContainer>
            <StackNavigator />
          </NavigationContainer>
        </NativeBaseProvider>
      </CardDataProvider>
    </AuthProvider>
  );
};

const StackNavigator = () => {

  const { isLoggedIn, isLoadingUserData } = useContext(AuthContext);
  const { isLoadingData } = useCardData();

  console.log('isLoadingUserData:', isLoadingUserData);
  console.log('isLoadingData:', isLoadingData);

  // Affichez le loader tant que l'utilisateur ou les données des cartes chargent
  if (isLoadingUserData || isLoadingData) {
    return <TypewriterLoader />;
  }

  return (
    <Stack.Navigator>
      {isLoggedIn ? (
        <Stack.Screen name="App" component={DrawerNavigator} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
          <Stack.Screen name="Inscription" component={Inscription} options={{ headerShown: false }} />
          <Stack.Screen name="Connexion" component={Connexion} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default App;
