import React from 'react';
import { Background } from '../../navigation/Background'; // Assurez-vous que ce chemin est correct
import { CardDataProvider } from '../../infrastructure/context/CardDataContexte'; // Assurez-vous que ce chemin est correct
import { Box, VStack, Text, Input, Button } from 'native-base';

const AddSecret = () => {
  return (
    <Background>
      <CardDataProvider>
        <Box flex={1} padding={5}>
          <VStack space={4} alignItems="center" justifyContent="center" flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              Ajouter un Secret
            </Text>
            {/* Champ pour le titre */}
            <Input
              placeholder="Titre du secret"
              variant="filled"
              width="100%"
              borderRadius="8"
              backgroundColor="gray.100"
            />
            {/* Champ pour la description */}
            <Input
              placeholder="Description du secret"
              variant="filled"
              width="100%"
              borderRadius="8"
              backgroundColor="gray.100"
              multiline
              height="120"
            />
            {/* Bouton pour soumettre */}
            <Button width="100%" borderRadius="8" onPress={() => console.log('Secret ajouté !')}>
              Soumettre
            </Button>
          </VStack>
        </Box>
      </CardDataProvider>
    </Background>
  );
};

export default AddSecret;
