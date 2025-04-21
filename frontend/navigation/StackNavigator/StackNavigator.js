import React, { useContext, useEffect, useState } from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import Connexion from '../../presentation/screens/Connexion';
import DrawerNavigator from '../DrawerNavigator';
import TypewriterLoader from '../../presentation/components/TypewriterLoader';
import SharedSecretScreen from '../../presentation/screens/SharedScreen';
import ContactsList from '../../presentation/components/ContactsList';


const Stack = createStackNavigator();

const StackNavigator = () => {
    const { isLoggedIn, userData } = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <TypewriterLoader />;
    }


    return (
        <Stack.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                gestureEnabled: true,
                cardStyleInterpolator: ({ current, layouts, closing }) => {
                    // Si c'est une déconnexion (transition vers l'écran de connexion)
                    if (!isLoggedIn && route.name === 'Connexion') {
                        return {
                            cardStyle: {
                                transform: [
                                    {
                                        translateX: current.progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [-layouts.screen.width, 0],
                                        }),
                                    },
                                ],
                            },
                        };
                    }
                    // Pour toutes les autres transitions
                    return CardStyleInterpolators.forHorizontalIOS;
                },
            })}
        >
            {isLoggedIn ? (
                <>
                    <Stack.Screen
                        name="MainApp"
                        component={DrawerNavigator}
                        options={{ headerShown: false }}
                    />
                    {/* Ajout de l'écran SharedSecret ici */}
                    <Stack.Screen
                        name="SharedSecret"
                        component={SharedSecretScreen}
                        options={{
                            headerShown: false,
                            presentation: 'modal'
                        }}
                    />
                    <Stack.Screen
                        name="Contacts"
                        component={ContactsList}
                        options={{ headerShown: false }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen name="Connexion" component={Connexion} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
};

export default StackNavigator;