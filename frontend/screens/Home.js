import React, { useContext } from 'react';
import { VStack, Box, Button, Text } from 'native-base';
import { AuthContext } from '../context/AuthContext'; // Importer le contexte d'authentification

export default function Home() {

    return (
        <Box flex={1} justifyContent="center" alignItems="center" p={5} bg="white">
            <VStack space={4} alignItems="center">
                <Text fontSize="2xl" fontWeight="bold" color="black">
                    Bienvenue sur Undy ! 
                </Text>
            </VStack>
        </Box>
    );
}
