// HomeStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../../presentation/screens/Home';

const Stack = createStackNavigator();

const HomeStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="MainFeed"
                component={Home}
                options={{ headerShown: false }}
            />
         
        </Stack.Navigator>
    );
};

export default HomeStackNavigator;
