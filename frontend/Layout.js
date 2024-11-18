import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome } from '@fortawesome/free-solid-svg-icons';
import Home from './screens/Home';
import Profile from './screens/Profile';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let icon;

                    if (route.name === 'Home') {
                        icon = faHome; // Icône pour la page "Home"
                    } else if (route.name === 'Profile') {
                        icon = faUser; // Icône pour la page "Profile"
                    }

                    return <FontAwesomeIcon icon={icon} size={size} color={color} />;
                },
                tabBarShowLabel: false, // Supprime le nom des onglets
                tabBarActiveTintColor: 'black', // Couleur des icônes actives
                tabBarInactiveTintColor: 'gray', // Couleur des icônes inactives
                tabBarStyle: {
                    backgroundColor: 'white', // Couleur de fond de la barre de navigation
                },
            })}
        >
            <Tab.Screen name="Home" component={Home} options={{ title: 'Accueil' }} />
            <Tab.Screen name="Profile" component={Profile} options={{ title: 'Profil' }} />
        </Tab.Navigator>
    );
}

function DrawerNavigator() {
    return (
        <Drawer.Navigator initialRouteName="Tabs">
            <Drawer.Screen name="Tabs" component={TabNavigator} options={{ title: 'Navigation', headerShown: false }} />
        </Drawer.Navigator>
    );
}

export default DrawerNavigator;
