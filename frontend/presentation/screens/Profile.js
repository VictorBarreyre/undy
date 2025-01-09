import React, { useState, useContext, useEffect } from 'react';
import { Platform, VStack, Box, Text, Button, Pressable, Image, Input, HStack, Spinner } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';

export default function Profile({ navigation }) {
    const { userData, userToken } = useContext(AuthContext);
    const { fetchSecretsCountByUser } = useCardData();
    const [secretCount, setSecretCount] = useState(null);


    useEffect(() => {
        console.log('Token utilisateur:', userToken); // Ajout de log
        const loadSecretCount = async () => {
            if (userToken) {
                const count = await fetchSecretsCountByUser(userToken);
                setSecretCount(count);
            }
        };
        loadSecretCount();
    }, [userToken]);


    console.log(secretCount)

    console.log(userData)


    return (
        <Background>
            <Box flex={1} justifyContent="flex-start" padding={5}>
                <VStack space={6}>
                    <HStack alignItems="center" justifyContent="space-between" width="100%">
                        {/* Icône Back */}
                        <Pressable onPress={() => console.log('Retour en arrière')}>
                            <FontAwesome name="chevron-left" size={18} color="black" />
                        </Pressable>

                        {/* Texte */}
                        <Text style={styles.h3} textAlign="center">
                            Mon Profil
                        </Text>

                        {/* Icône Settings */}
                        <Pressable onPress={() => console.log('Paramètres')}>
                            <FontAwesome5 name="cog" size={26} color="black" solid={false} />
                        </Pressable>
                    </HStack>

                    <HStack alignItems="center">
                        <Image
                            src={userData.profilePicture}
                            alt={`${userData?.name || 'User'}'s profile picture`}
                            width={75} // Ajustez la taille de l'image ici
                            height={75} // Ajustez la taille de l'image ici
                            borderRadius="full" // Rendre l'image ronde
                        >
                        </Image>

                        <VStack alignItems="center">
                            {/* Nombre de secrets */}
                            <Text style={styles.h4} fontWeight="bold" color="black" textAlign="center">
                                {secretCount || 0}
                            </Text>
                            {/* Texte "secret" */}
                            <Text style={styles.caption} textAlign="center">
                                Secrets 
                            </Text>
                        </VStack>

                    </HStack>
                </VStack>
            </Box>
        </Background>
    );
};

const customStyles = StyleSheet.create({

    container: {
        display: 'flex',
        flex: 1,
        height: 'auto',
        width: '100%',
        justifyContent: 'space-between', // Ajoute de l'espace entre les éléments
        alignItems: 'start',
        alignContent: 'start'
    },


    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
});
