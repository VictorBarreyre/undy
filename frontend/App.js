import React, { useContext } from 'react';
import { NativeBaseProvider } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './components/Register';
import Login from './components/Login';
import DrawerNavigator from './Layout';  // Import du DrawerNavigator
import { DATABASE_URL } from '@env';

const Stack = createStackNavigator();

export default function App() {
    return (
        <AuthProvider>
            <NativeBaseProvider>
                <NavigationContainer>
                    <StackNavigator />
                </NavigationContainer>
            </NativeBaseProvider>
        </AuthProvider>
    );
}

const StackNavigator = () => {
    const { isLoggedIn } = useContext(AuthContext);  // Vérifier si l'utilisateur est connecté

    console.log(DATABASE_URL)

    return (
        <Stack.Navigator>
            {isLoggedIn ? (
                // Si l'utilisateur est connecté, afficher le DrawerNavigator
                <Stack.Screen name="App" component={DrawerNavigator} options={{ headerShown: false }} />
            ) : (
                // Si l'utilisateur n'est pas connecté, afficher Login/Register
                <>
                    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
};
