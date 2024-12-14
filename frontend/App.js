import React, { useContext, useState } from 'react';
import 'react-native-gesture-handler';
import { NativeBaseProvider } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './components/Register';
import Inscription from './components/Inscription';
import Connexion from './components/Connexion';
import DrawerNavigator from './Layout';
import { lightTheme } from './theme';
import * as Font from 'expo-font';

const Stack = createStackNavigator();

const App = () => {
    const [fontsLoaded, setFontsLoaded] = useState(false);

    const loadFonts = async () => {
        await Font.loadAsync({
            'SF-Pro-Display-Regular': require('./assets/fonts/SF-Pro-Display-Regular.otf'),
            'SF-Pro-Display-Medium': require('./assets/fonts/SF-Pro-Display-Medium.otf'),
            'SF-Pro-Display-Semibold': require('./assets/fonts/SF-Pro-Display-Semibold.otf'),
            'SF-Pro-Display-Bold': require('./assets/fonts/SF-Pro-Display-Bold.otf'),
        });
    };

    React.useEffect(() => {
        loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
    }, []);

    if (!fontsLoaded) {
        return null; // Écran vide pendant le chargement des polices
    }

    return (
        <AuthProvider>
            <NativeBaseProvider theme={lightTheme}>
                <NavigationContainer
                    theme={{
                        colors: {
                            background: 'transparent', // S'assure que le fond est transparent
                        },
                    }}
                >
                    <StackNavigator />
                </NavigationContainer>
            </NativeBaseProvider>
        </AuthProvider>
    );
};

const StackNavigator = () => {
    const { isLoggedIn } = useContext(AuthContext);

    return (
        <Stack.Navigator >
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
