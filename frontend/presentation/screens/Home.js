import React from 'react';
import { VStack, Box, Text } from 'native-base';
import FilterBar from '../components/Filter.bar';

export default function Home() {
    return (
        <Box bg="transparent" flex={1} >
            {/* Barre de filtres en haut */}
            <Box top={0} width="100%" bg="transparent" px={0} py={4} >
                <FilterBar />
            </Box> 

            {/* Contenu principal */}
            <VStack flex={1} space={4} mt="20" alignItems="center" p={5}>
                <Text fontSize="2xl" fontWeight="bold" color="black">
                    Bienvenue sur Undy !
                </Text>

                {/* Ajoutez ici d'autres composants comme la carte ou les contenus */}
                <Text fontSize="md" textAlign="center" color="gray.600">
                    Explorez les filtres ci-dessus pour découvrir plus d'options.
                </Text>
            </VStack>
        </Box>
    );
}
