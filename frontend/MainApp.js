import React, { useState, useContext, useEffect } from 'react';
import { Text } from 'native-base';
import { AuthContext } from './infrastructure/context/AuthContext';
import StackNavigator from './navigation/StackNavigator';
import * as Font from 'expo-font';

const MainApp = () => {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const { isLoggedIn, checkUserToken } = useContext(AuthContext);

    const loadFonts = async () => {
        await Font.loadAsync({
            'SF-Pro-Display-Regular': require('./assets/fonts/SF-Pro-Display-Regular.otf'),
            'SF-Pro-Display-Medium': require('./assets/fonts/SF-Pro-Display-Medium.otf'),
            'SF-Pro-Display-Semibold': require('./assets/fonts/SF-Pro-Display-Semibold.otf'),
            'SF-Pro-Display-Bold': require('./assets/fonts/SF-Pro-Display-Bold.otf'),
        });
    };

    useEffect(() => {
        loadFonts().then(() => setFontsLoaded(true)).catch(console.warn);
        checkUserToken();
    }, [checkUserToken]);

    if (!fontsLoaded || isLoggedIn === null) {
        return <Text>Loading...</Text>; // Affiche un écran de chargement temporaire
    }

    return <StackNavigator />;
};

export default MainApp;
