import React, { useState, useContext } from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { Box, Text, HStack, VStack, Image, Button, Input } from 'native-base';
import { Pressable, Dimensions, StyleSheet } from 'react-native';
import { styles } from '../../infrastructure/theme/styles'; 

const SCREEN_WIDTH = Dimensions.get('window').width;


const AddSecret = () => {

    const { userData } = useContext(AuthContext); // Utilisation correcte de useContext
    const [secretText, setSecretText] = useState(''); 

    console.log(userData)


    const handlePostSecret = () => {
        console.log(`Nouveau secret : ${secretText}`);
        // Logique pour envoyer le secret au backend ou effectuer une action
        setSecretText(''); // Réinitialise le champ après l'envoi
    };

    return (
        <Background>
            <Box flex={1} padding={5}>
                <VStack space={4} alignItems="center" justifyContent="start" flex={1}>
                    <Text style={styles.h2} fontSize="lg" fontWeight="bold">
                        Ajouter un Secret
                    </Text>
                    <Box
                        display="flex"
                        width="100%"
                        marginX="auto"
                        height="75%"
                        borderRadius="lg"
                        backgroundColor="white"
                        marginTop={2}
                        paddingTop={1}
                        paddingBottom={4}
                        justifyContent="space-between"
                        style={[styles.cardStyle, customStyles.shadowBox]} 
                    >
                        {/* Contenu texte */}
                        <VStack backgroundColor="white" height={'100%'} justifyContent="space-between" padding={4} space={2}>
                            <HStack alignItems="center" justifyContent="space-between" width="95%">
                                {/* Texte aligné à gauche */}
                                <Box flex={1} mr={4} ml={2} >
                                    <Text left={2} style={styles.h5}>
                                        Posté par {userData.name || 'Aucune description disponible.'}
                                    </Text>
                                </Box>
                                {/* Image alignée à droite */}

                            </HStack>

                            <Box  ml={2}  width="95%" >
                                <Text fontSize="md" color="gray.500" mb={2}>
                                    Entrez votre secret
                                </Text>
                                <Input
                                    value={secretText}
                                    onChangeText={(text) => setSecretText(text)}
                                    placeholder="Tapez ici votre secret..."
                                    backgroundColor="gray.100"
                                    borderRadius="md"
                                    fontSize="md"
                                    p={4}
                                    multiline
                                    numberOfLines={4}
                                />
                            </Box>

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

const customStyles = StyleSheet.create({
    shadowBox: {
        shadowColor: 'violet',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
  });


export default AddSecret;
