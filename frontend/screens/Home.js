import React, { useContext } from 'react';
import { VStack, Box, Button, Text } from 'native-base';
import { AuthContext } from '../context/AuthContext'; // Importer le contexte d'authentification

export default function Home() {
    const { logout } = useContext(AuthContext); // Récupérer la fonction logout depuis le contexte

    return (
        <Box flex={1} justifyContent="center" alignItems="center" p={5} bg="white">
            <VStack space={4} alignItems="center">
                <Text fontSize="2xl" fontWeight="bold" color="primary.500">
                    Bienvenue à la maison !
                </Text>
                <Button onPress={logout} colorScheme="primary" w="100%">
                    Déconnexion
                </Button>
            </VStack>
        </Box>
    );
}
