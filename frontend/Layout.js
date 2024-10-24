import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';  // Utilisation des icônes (si besoin)
import Home from './screens/Home';  // Ton écran Home
import Profile from './screens/Profile';  // Un écran supplémentaire de profil

// Créer les navigateurs
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Définir le Tab Navigator
function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = 'home';
                    } else if (route.name === 'Profile') {
                        iconName = 'user';
                    }

                    return <FontAwesome name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={Home} options={{ title: 'Accueil' }} />
            <Tab.Screen name="Profile" component={Profile} options={{ title: 'Profil' }} />
        </Tab.Navigator>
    );
}

// Définir le Drawer Navigator
function DrawerNavigator() {
    return (
        <Drawer.Navigator initialRouteName="Tabs">
            <Drawer.Screen name="Tabs" component={TabNavigator} options={{ title: 'Navigation' }} />
            {/* Ajoute d'autres écrans dans le drawer ici */}
        </Drawer.Navigator>
    );
}

export default DrawerNavigator;
