import React ,{  useContext} from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome, faPlus } from '@fortawesome/free-solid-svg-icons';
import Home from '../presentation/screens/Home'; // Ajustez le chemin si nécessaire
import AddSecret from '../presentation/screens/AddSecret';
import { AuthContext } from '../infrastructure/context/AuthContext'
import ProfileStackNavigator from './StackNavigator/ProfileStackNavigator';
import ProfilTiers from '../presentation/screens/ProfilTiers';
import HomeStackNavigator from './StackNavigator/HomeStackNavigator';


const Tab = createBottomTabNavigator();

const TabNavigator = () => {

    const { userData, userToken } = useContext(AuthContext);


    return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size, focused }) => {
                if (route.name === 'Home') {
                    return <FontAwesomeIcon icon={faHome} size={size} color={color} />;
                } else if (route.name === 'Profile') {
                    if (userData && userData.profilePicture) {
                        return (
                            <Image
                                alt={`${userData?.name || 'User'}'s profile picture`}
                                source={{ uri: userData.profilePicture }}
                                style={{
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    borderWidth: focused ? 1 : 0,
                                    borderColor: focused ? '#FF78B2' : 'transparent'
                                  }}
                            />
                        );
                    } else {
                        return <FontAwesomeIcon icon={faUser} size={size} color={color} />;
                    }
                } else if (route.name === 'AddSecret') {
                    return <FontAwesomeIcon icon={faPlus} size={size} color={color} />;
                }
            },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#FF78B2',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: {
                    backgroundColor: 'white', // Transparent pour afficher le fond
                    elevation: 0, // Supprime l'ombre sur Android
                    borderTopWidth: 0, // Supprime la bordure sur iOS
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeStackNavigator}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="AddSecret"
                component={AddSecret}
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
