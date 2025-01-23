import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import Register from '../../presentation/screens/Register';
import Inscription from '../../presentation/screens/Inscription';
import Connexion from '../../presentation/screens/Connexion';
import DrawerNavigator from '../Layout';

const Stack = createStackNavigator();

const StackNavigator = () => {
    const { isLoggedIn, userData } = useContext(AuthContext);

    return (
        <Stack.Navigator>
            {isLoggedIn && userData ? (
                <Stack.Screen name="App" component={DrawerNavigator} options={{ headerShown: false }} />
            ) : (
                <>
                    <Stack.Screen name="Connexion" component={Connexion} options={{ headerShown: false }} />
                    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
                    <Stack.Screen name="Inscription" component={Inscription} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
};

export default StackNavigator;