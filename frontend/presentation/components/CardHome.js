import React from 'react';
import { Box, Text, HStack, VStack, Image, Button, Icon } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles'

export default function CardHome() {
    return (

        <Box
            width="100%"
            height="80%"
            marginX="auto"
            borderRadius="lg"
            overflow="hidden"
            backgroundColor="white"
            marginTop={2}
            shadow={0}
        >
            {/* Image principale */}
            <Image
                source={require('../../assets/images/card-image.png')} // Remplacez par une URL ou une image locale
                alt="Alice Dupont"
                width="100%"
                height={200}
            />

            {/* Contenu texte */}
            <VStack padding={4} space={2}>
                <Text  style={styles.h5}>
                    Le Lorem Ipsum est simplement  du faux texte utilisé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard...
                </Text>

            </VStack>

            {/* Section des statistiques */}
            <HStack
                paddingX={4}
                paddingBottom={4}
                justifyContent="space-between"
                alignItems="center"
            >
                {/* Statistiques : likes */}
                <HStack space={1} alignItems="center">
                    <Icon as={FontAwesome5} name="heart" color="pink.500" />
                    <Text color="gray.500" fontSize="sm">
                        70
                    </Text>
                </HStack>

                {/* Statistiques : commentaires */}
                <HStack space={1} alignItems="center">
                    <Icon as={FontAwesome5} name="comment-alt" color="gray.500" />
                    <Text color="gray.500" fontSize="sm">
                        22
                    </Text>
                </HStack>

                {/* Statistiques : partages */}
                <HStack space={1} alignItems="center">
                    <Icon as={FontAwesome5} name="share-alt" color="gray.500" />
                    <Text color="gray.500" fontSize="sm">
                        4
                    </Text>
                </HStack>

                {/* Bouton Amour */}
                <Text color="gray.500" fontSize="sm">
                    Amour ❤️
                </Text>
            </HStack>
        </Box>
    );
}
