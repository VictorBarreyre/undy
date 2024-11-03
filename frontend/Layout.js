import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';
import Home from './screens/Home';
import Profile from './screens/Profile';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

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
