import React from 'react';
import { View, Text, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';

const ProfilTiers = () => {
    const route = useRoute();
    const { userId, userName, profilePicture } = route.params || {};
  
    return (
      <View>
        <Text>Nom: {userName || "Nom inconnu"}</Text>
        {profilePicture && (
          <Image 
            source={{ uri: profilePicture }}
            style={{ width: 100, height: 100 }}
          />
        )}
      </View>
    );
  };

export default ProfilTiers;
