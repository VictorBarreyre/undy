import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome, faPlus, faComments } from '@fortawesome/free-solid-svg-icons';
import AddSecret from '../presentation/screens/AddSecret';
import { AuthContext } from '../infrastructure/context/AuthContext'
import ProfileStackNavigator from './StackNavigator/ProfileStackNavigator';
import HomeStackNavigator from './StackNavigator/HomeStackNavigator';
import ConversationStackNavigator from './StackNavigator/ConversationStackNavigator';


const Tab = createBottomTabNavigator();

const TabNavigator = () => {

    const { userData, userToken } = useContext(AuthContext);


    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size, focused }) => {
                    switch (route.name) {
                        case 'HomeTab':
                            return <FontAwesomeIcon icon={faHome} size={size} color={color} />;
                        case 'Profile':
                            return userData?.profilePicture ? (
                                <Image
                                    alt="Profile"
                                    source={{ uri: userData.profilePicture }}
                                    style={{
                                        width: size,
                                        height: size,
                                        borderRadius: size / 2,
                                        borderWidth: focused ? 1 : 0,
                                        borderColor: focused ? '#FF78B2' : 'transparent'
                                    }}
                                />
                            ) : (
                                <FontAwesomeIcon icon={faUser} size={size} color={color} />
                            );
                        case 'AddSecret':
                            return <FontAwesomeIcon icon={faPlus} size={size} color={color} />;
                        case 'ChatTab':
                            return <FontAwesomeIcon icon={faComments} size={size} color={color} />;
                    }
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#FF78B2',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: {
                    backgroundColor: 'white',
                    elevation: 0,
                    borderTopWidth: 0,
                },
            })}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeStackNavigator}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="AddSecret"
                component={AddSecret}
                options={{ headerShown: false }}
            />

            <Tab.Screen
                name="ChatTab"
                component={ConversationStackNavigator}
                options={{ headerShown: false }}
            />

            <Tab.Screen
                name="Profile"
                component={ProfileStackNavigator}
                options={{ headerShown: false }}
            />
        </Tab.Navigator>
    );
};

export default TabNavigator;
