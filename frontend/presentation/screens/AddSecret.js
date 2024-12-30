import React from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { Box, Text, HStack, VStack, Image, Button } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';

const AddSecret = () => {

      const { data } = useCardData(); // Accéder aux données via le contexte
    
    return (
        <Background>
                <Box flex={1} padding={5}>
                    <VStack space={4} alignItems="center" justifyContent="center" flex={1}>
                        <Text fontSize="lg" fontWeight="bold">
                            Ajouter un Secret
                        </Text>
                        <Box
                            display="flex" // Utilise le modèle Flexbox
                            width="100%"
                            marginX="auto"
                            height='100%'
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
                                            Posté par {data.posterpar || 'Aucune description disponible.'}
                                        </Text>
                                    </Box>
                                    {/* Image alignée à droite */}
                                    <Image
                                        source={data[0]?.image} // Image du contexte
                                        alt={data[0]?.title || 'Carte'}
                                        width={35} // Ajustez la taille de l'image ici
                                        height={35} // Ajustez la taille de l'image ici
                                        borderRadius="full" // Rendre l'image ronde
                                    />
                                </HStack>

                                {/* Wrapper for the text with blur effect */}
                                <Box
                                    height="auto"
                                    position="relative"
                                    overflow="hidden"
                                    justifyContent="center" // Centre verticalement les enfants
                                    alignItems="center" // Centre horizontalement les enfants
                                >
                               
                            
                                    {/* Bouton centré */}
                                </Box>

                         
                            </VStack>
                        </Box>
                    </VStack>
                </Box>
        </Background>
    );
};

export default AddSecret;
