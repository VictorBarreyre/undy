import React from 'react';
import { Image, View, Platform, StatusBar, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { styles as appStyles } from '../infrastructure/theme/styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabNavigator from './TabNavigator';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Conversion de Background en composant React Native pur
export function Background({ children }) {
    return (
        <View style={styles.backgroundContainer}>
            {/* Fond statique derrière tout */}
            <Image
                source={require('../assets/images/backgroundbp.png')}
                style={appStyles.staticBackground} // zIndex: -1 est appliqué ici
                resizeMode="cover"
            />
            {/* Contenu des enfants */}
            <View style={styles.contentContainer}>
                {children}
            </View>
        </View>
    );
}

function DrawerNavigator() {
    const insets = useSafeAreaInsets();

    return (
        <Background>
            <View style={[
                styles.drawerContainer, 
                { paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight : 0) }
            ]}>
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
            </View>
        </Background>
    );
}

// Styles spécifiques à ce composant
const styles = StyleSheet.create({
    backgroundContainer: {
        flex: 1,
        position: 'relative',
    },
    contentContainer: {
        flex: 1,
        zIndex: 1,
        backgroundColor: 'transparent',
    },
    drawerContainer: {
        flex: 1,
    }
});

export default DrawerNavigator;