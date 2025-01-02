import React, { useContext } from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { Box, Text, HStack, VStack, Image, Button } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';
import { Pressable } from 'react-native';

const AddSecret = () => {

    const { userData } = useContext(AuthContext); // Utilisation correcte de useContext

    console.log(userData)

    return (
        <Background>
            <Box flex={1} padding={5}>
                <VStack space={4} alignItems="center" justifyContent="start" flex={1}>
                    <Text style={styles.h2} fontSize="lg" fontWeight="bold">
                        Ajouter un Secret
                    </Text>
                    <Box
                        display="flex" // Utilise le modèle Flexbox
                        width="100%"
                        marginX="auto"
                        height='75%'
                        borderRadius="lg"
                        overflow="hidden"
                        backgroundColor="white"
                        marginTop={2}
                        shadow={10}
                        paddingTop={1}
                        paddingBottom={4}
                        justifyContent="space-between"
                        style={styles.boxShadow}
                    >
                        {/* Contenu texte */}
                        <VStack height={'100%'} justifyContent="space-between" padding={4} space={2}>
                            <HStack alignItems="center" justifyContent="space-between" width="95%">
                                {/* Texte aligné à gauche */}
                                <Box flex={1} mr={4} ml={2} >
                                    <Text left={2} style={styles.h5}>
                                        Posté par {userData.name || 'Aucune description disponible.'}
                                    </Text>
                                </Box>
                                {/* Image alignée à droite */}

                            </HStack>

                        </VStack>
                    </Box>
                    <Pressable
                        onPress={() => {
                            console.log('Bouton cliqué !');
                        }}
                        style={({ pressed }) => [
                            {
                                backgroundColor: pressed ? 'gray.800' : 'black',
                                transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
                                borderRadius: 20,
                            },
                            { width: '100%', alignSelf: 'center',marginTop:18, padding: 18, borderRadius: 30 },
                        ]}
                    >
                        <HStack alignItems="center" justifyContent="center" space={2}>
                            <Text fontSize="md" color="white" fontWeight="bold">
                                Poser le secret
                            </Text>
                        </HStack>
                    </Pressable>
                </VStack>
            </Box>
        </Background>
    );
};

export default AddSecret;
