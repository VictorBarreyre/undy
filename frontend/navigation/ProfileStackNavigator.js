import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Profile from '../presentation/screens/Profile'; // Écran principal
import ProfilSettings from '../presentation/screens/ProfilSettings'; // Nouvel écran

const Stack = createStackNavigator();

const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={Profile}
        options={{ headerShown: false }} // Désactive l'en-tête natif pour l'écran principal
      />
      <Stack.Screen
        name="ProfilSettings"
        component={ProfilSettings}
        options={{ headerShown: false }} // Titre de l'en-tête natif
      />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
