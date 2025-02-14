import React, { useContext, useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import Inscription from '../../presentation/screens/Inscription';
import Connexion from '../../presentation/screens/Connexion';
import DrawerNavigator from '../DrawerNavigator';
import TypewriterLoader from '../../presentation/components/TypewriterLoader';

const Stack = createStackNavigator();

const StackNavigator = () => {
    const { isLoggedIn } = useContext(AuthContext);

    // Supprimez temporairement tous les autres hooks et conditions
    return (
        <Stack.Navigator>
            {isLoggedIn ? (
                <Stack.Screen 
                    name="MainApp" 
                    component={DrawerNavigator} 
                    options={{ headerShown: false }} 
                />
            ) : (
                <Stack.Screen 
                    name="Connexion" 
                    component={Connexion} 
                    options={{ headerShown: false }} 
                />
            )}
        </Stack.Navigator>
    );
};

export default StackNavigator;