import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';

const ProfilTiers = () => {
    const route = useRoute();
    const { userId, userName, profilePicture } = route.params || {};
    const { userToken, fetchUserDataById } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);

    
    useEffect(() => {
      const loadUserData = async () => {
          try {
              const data = await fetchUserDataById(userId, userToken);
              setUserData(data);
          } catch (error) {
              console.error('Erreur lors du chargement des données de l\'utilisateur :', error);
          }
      };

      console.log(userData)
      loadUserData();
  }, []);
  
  return (
    <View>
        {userData ? (
            <>
                <Text>Nom: {userData.name || "Nom inconnu"}</Text>
                {userData.profilePicture && (
                    <Image
                        source={{ uri: userData.profilePicture }}
                        style={{ width: 100, height: 100 }}
                    />
                )}
            </>
        ) : (
            <Text>Chargement des données...</Text>
        )}
    </View>
);
};


export default ProfilTiers;
