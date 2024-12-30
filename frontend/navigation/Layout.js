import React from 'react';
import {  Image, SafeAreaView } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome } from '@fortawesome/free-solid-svg-icons';
import Home from '../presentation/screens/Home';
import Profile from '../presentation/screens/Profile';
import { Box } from 'native-base';
import { styles } from '../infrastructure/theme/styles';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AddSecret from '../presentation/screens/AddSecret';
import TabNavigator from './TabNavigator';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();


export function Background({ children }) {
    return (
        <Box flex={1} position="relative">
            {/* Fond statique derrière tout */}
            <Image
                source={require('../assets/images/backgroundbp.png')}
                style={styles.staticBackground} // zIndex: -1 est appliqué ici
                resizeMode="cover"
            />
            {/* Contenu des enfants */}
            <Box flex={1} zIndex={1} backgroundColor="transparent">
                {children}
            </Box>
        </Box>
    );
}


function DrawerNavigator() {
    const insets = useSafeAreaInsets();

    return (
        <Background>
            <SafeAreaProvider >
            <Box style={{ paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight : 0) }} flex={1}>
                <Drawer.Navigator
                    initialRouteName="Tabs"
                    screenOptions={{
                        drawerStyle: {
                            backgroundColor: 'transparent', // Transparent pour afficher le fond
                        },
                        swipeEnabled: false,
                    }}
                >
                    <Drawer.Screen
                        name="Tabs"
                        component={TabNavigator}
                        options={{ title: 'Navigation', headerShown: false }}
                    />
                </Drawer.Navigator>
            </Box>
            </SafeAreaProvider>
        </Background>
    );
}

export default DrawerNavigator;
