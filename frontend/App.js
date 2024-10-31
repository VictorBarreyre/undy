import React, { useContext, useCallback } from 'react';
import { NativeBaseProvider } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './components/Register';
import Login from './components/Login';
import DrawerNavigator from './Layout'; // Import du DrawerNavigator
import { DATABASE_URL } from '@env';

const Stack = createStackNavigator();

const App = React.memo(function App() {
    return (
        <AuthProvider>
            <NativeBaseProvider>
                <NavigationContainer>
                    <StackNavigator />
                </NavigationContainer>
            </NativeBaseProvider>
        </AuthProvider>
    );
});

const StackNavigator = React.memo(() => {
    const { isLoggedIn } = useContext(AuthContext);

    return (
        <Stack.Navigator>
            {isLoggedIn ? (
                <Stack.Screen name="App" component={DrawerNavigator} options={{ headerShown: false }} />
            ) : (
                <>
                    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
});

export default App;
