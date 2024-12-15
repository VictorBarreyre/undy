import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome } from '@fortawesome/free-solid-svg-icons';
import Home from '../presentation/screens/Home'; // Ajustez le chemin si nécessaire
import Profile from '../presentation/screens/Profile'; // Ajustez le chemin si nécessaire

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let icon;
                    if (route.name === 'Home') {
                        icon = faHome;
                    } else if (route.name === 'Profile') {
                        icon = faUser;
                    }
                    return <FontAwesomeIcon icon={icon} size={size} color={color} />;
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: 'black',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    backgroundColor: 'white', // Transparent pour afficher le fond
                    elevation: 0, // Supprime l'ombre sur Android
                    borderTopWidth: 0, // Supprime la bordure sur iOS
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={Home}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{ headerShown: false }}
            />
        </Tab.Navigator>
    );
};

export default TabNavigator;
