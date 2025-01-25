import React, { useContext,useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import Register from '../../presentation/screens/Register';
import Inscription from '../../presentation/screens/Inscription';
import Connexion from '../../presentation/screens/Connexion';
import DrawerNavigator from '../DrawerNavigator';
import TypewriterLoader from '../../presentation/components/TypewriterLoader';


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
        <Stack.Navigator>
            {isLoggedIn  ? (
                <Stack.Screen name="MainApp" component={DrawerNavigator} options={{ headerShown: false }} />
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