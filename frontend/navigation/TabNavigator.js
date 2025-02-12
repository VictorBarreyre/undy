import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome, faPlus, faComments } from '@fortawesome/free-solid-svg-icons';
import AddSecret from '../presentation/screens/AddSecret';
import { AuthContext } from '../infrastructure/context/AuthContext'
import ProfileStackNavigator from './StackNavigator/ProfileStackNavigator';
import HomeStackNavigator from './StackNavigator/HomeStackNavigator';
import ConversationStackNavigator from './StackNavigator/ConversationStackNavigator';
import MaskedView from '@react-native-masked-view/masked-view';
import { Animated, Platform, StatusBar } from 'react-native';


const Tab = createBottomTabNavigator();

const GradientIcon = ({ icon, size, focused }) => {
  if (!focused) {
    return <FontAwesomeIcon icon={icon} size={size} color="#94A3B8" />;
  }

  return (
    <MaskedView
      maskElement={
        <View style={{ 
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <FontAwesomeIcon icon={icon} size={size} color="black" />
        </View>
      }
    >
      <LinearGradient
        colors={['#FF587E', '#CC4B8D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ 
          width: size, 
          height: size,
        }}
      />
    </MaskedView>
  );
};

const TabNavigator = () => {
  const { userData, userToken } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          switch (route.name) {
            case 'HomeTab':
              return <GradientIcon icon={faHome} size={size} focused={focused} />;
            case 'Profile':
              return userData?.profilePicture ? (
                <Image
                  alt="Profile"
                  source={{ uri: userData.profilePicture }}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: focused ? 2 : 0,
                    borderColor: focused ? 'white' : 'transparent'
                  }}
                />
              ) : (
                <GradientIcon icon={faUser} size={size} focused={focused} />
              );
            case 'AddSecret':
              return <GradientIcon icon={faPlus} size={size} focused={focused} />;
            case 'ChatTab':
              return <GradientIcon icon={faComments} size={size} focused={focused} />;
          }
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#94A3B8',
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