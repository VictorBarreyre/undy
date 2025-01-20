// HomeStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../../presentation/screens/Home';
import ProfilTiers from '../../presentation/screens/ProfilTiers';

const Stack = createStackNavigator();

const HomeStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Home"
                component={Home}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ProfilTiers"
                component={ProfilTiers}
                options={{ headerShown: true, title: "Profil Utilisateur" }}
            />
        </Stack.Navigator>
    );
};

export default HomeStackNavigator;
