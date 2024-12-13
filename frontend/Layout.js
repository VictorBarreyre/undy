import React from 'react';
import { Platform, StatusBar, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome } from '@fortawesome/free-solid-svg-icons';
import Home from './screens/Home';
import Profile from './screens/Profile';
import { Box } from 'native-base';
import { styles } from './styles'

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 50;

export function Background({ children }) {
    return (
        <Box flex={1}>
            {/* Fond statique derrière tout */}
            <Image
                source={require('./assets/images/bgstatic.png')}
                style={styles.staticBackground} // Style spécifique
                resizeMode="cover"
            />
            {/* Contenu des enfants */}
            <Box flex={1} zIndex={1}> {/* Assurez-vous que le contenu a un zIndex supérieur */}
                {children}
            </Box>
        </Box>
    );
}

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let icon;
                    if (route.name === 'Home') {
                        icon = faHome;
                    } else if (route.name === 'Profile') {
                        icon = faUser;
                    }
                    return <FontAwesomeIcon icon={icon} size={size} color={color} />;
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: 'black',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    backgroundColor: 'white', // Transparent pour laisser apparaître le fond
                    elevation: 0, // Supprime l'ombre sur Android
                    borderTopWidth: 0, // Supprime la bordure sur iOS
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={Home}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{ headerShown: false }}
            />
        </Tab.Navigator>
    );
}


function DrawerNavigator() {
    return (
        <Background>
            <Box flex={1}backgroundColor="transparent">
                <Drawer.Navigator initialRouteName="Tabs">
                    <Drawer.Screen
                        name="Tabs"
                        component={TabNavigator}
                        options={{ title: 'Navigation', headerShown: false }}
                    />
                </Drawer.Navigator>
            </Box>
        </Background>
    );
}



export default DrawerNavigator;
