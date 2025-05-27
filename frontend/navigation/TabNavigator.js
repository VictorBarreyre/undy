import React, { useContext, useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHome, faPlus, faComments } from '@fortawesome/free-solid-svg-icons';
import AddSecret from '../presentation/screens/AddSecret';
import { AuthContext } from '../infrastructure/context/AuthContext';
import { useCardData } from '../infrastructure/context/CardDataContexte';
import ProfileStackNavigator from './StackNavigator/ProfileStackNavigator';
import HomeStackNavigator from './StackNavigator/HomeStackNavigator';
import ConversationStackNavigator from './StackNavigator/ConversationStackNavigator';
import MaskedView from '@react-native-masked-view/masked-view';
import TestScreen from '../presentation/screens/TestScreen';

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
  const { totalUnreadCount, refreshUnreadCounts } = useCardData();


  useEffect(() => {
    refreshUnreadCounts();
    console.log("TabNavigator - totalUnreadCount:", totalUnreadCount);
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(refreshUnreadCounts, 30000);
    
    return () => clearInterval(interval);
  }, []);


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
                return (
                 <View style={{ position: 'relative' }}>
                  <GradientIcon icon={faComments} size={size} focused={focused} />
                  {totalUnreadCount > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      overflow: 'hidden',
                      borderRadius: 10
                    }}>
                      <LinearGradient
                        colors={['#FF587E', '#CC4B8D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ 
                          color: 'white', 
                          fontSize: 10, 
                          fontWeight: 'bold' 
                        }}>
                          {totalUnreadCount}
                        </Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>
                );
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