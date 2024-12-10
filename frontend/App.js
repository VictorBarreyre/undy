import React, { useContext, useState } from 'react';
import 'react-native-gesture-handler';
import { NativeBaseProvider } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './components/Register';
import Inscription from './components/Inscription';
import Login from './components/Login';
import DrawerNavigator from './Layout'; // Import du DrawerNavigator
import { lightTheme } from './theme';
import * as Font from 'expo-font';
import AppLoading from 'expo-app-loading';


const Stack = createStackNavigator();

const App = React.memo(function App() {

    const [fontsLoaded, setFontsLoaded] = useState(false);

    const loadFonts = async () => {
        await Font.loadAsync({
          'SF-Pro-Display-Regular': require('./assets/fonts/SF-Pro-Display-Regular.otf'),
          'SF-Pro-Display-Medium': require('./assets/fonts/SF-Pro-Display-Medium.otf'),
          'SF-Pro-Display-Semibold': require('./assets/fonts/SF-Pro-Display-Semibold.otf'),
          'SF-Pro-Display-Bold': require('./assets/fonts/SF-Pro-Display-Bold.otf'),
        });
      };
    
      if (!fontsLoaded) {
        return (
          <AppLoading
            startAsync={loadFonts}
            onFinish={() => setFontsLoaded(true)}
            onError={console.warn}
          />
        );
      }
    

    return (
        <AuthProvider>
            <NativeBaseProvider theme={lightTheme} >
                <NavigationContainer>
                    <StackNavigator />
                </NavigationContainer>
            </NativeBaseProvider>
        </AuthProvider>
    );
});

const StackNavigator = React.memo(() => {
    const { isLoggedIn } = useContext(AuthContext);
 
    return (
        <Stack.Navigator>
            {isLoggedIn ? (
                <Stack.Screen name="App" component={DrawerNavigator} options={{ headerShown: false }} />
            ) : (
                <>
                    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
                    <Stack.Screen name="Inscription" component={Inscription} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
});

export default App;
