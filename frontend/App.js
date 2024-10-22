import React from 'react';
import { NativeBaseProvider, Box } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './components/Register';
import Login from './components/Login';
import Home from './screens/Home';

const Stack = createStackNavigator();

export default function App() {
    return (
        <AuthProvider>
            <NativeBaseProvider>
                <NavigationContainer>
                    <AuthContext.Consumer>
                        {({ isLoggedIn }) => (
                            <Stack.Navigator>
                                {isLoggedIn ? (
                                    <Stack.Screen name="Home" component={Home} />
                                ) : (
                                    <>
                                        <Stack.Screen name="Register" component={Register} />
                                        <Stack.Screen name="Login" component={Login} />
                                    </>
                                )}
                            </Stack.Navigator>
                        )}
                    </AuthContext.Consumer>
                </NavigationContainer>
            </NativeBaseProvider>
        </AuthProvider>
    );
}
