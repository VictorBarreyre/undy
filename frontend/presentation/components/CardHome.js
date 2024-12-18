// components/CardHome.js
import React from 'react';
import { Box, Text, HStack, VStack, Image, Icon } from 'native-base';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCardData } from '../../infrastructure/context/CardDataContexte'; // Importer le hook pour accéder au contexte

export default function CardHome() {
  const { data } = useCardData(); // Accéder aux données via le contexte

  if (!data || data.length === 0) {
    return <Text>No data available</Text>;
  }

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
      {/* Afficher l'image de la carte */}
      <Image
        source={data[0]?.image} // Utilisation de l'image de la carte à partir du contexte
        alt={data[0]?.title || "Carte"}
        width="100%"
        height={200}
      />

      {/* Contenu texte */}
      <VStack padding={4} space={2}>
        <Text style={{ fontSize: 18 }}>
          {data[0]?.description || "Aucune description disponible."}
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
            {data[0]?.likes || 0}
          </Text>
        </HStack>

        {/* Statistiques : commentaires */}
        <HStack space={1} alignItems="center">
          <Icon as={FontAwesome5} name="comment-alt" color="gray.500" />
          <Text color="gray.500" fontSize="sm">
            {data[0]?.comments || 0}
          </Text>
        </HStack>

        {/* Statistiques : partages */}
        <HStack space={1} alignItems="center">
          <Icon as={FontAwesome5} name="share-alt" color="gray.500" />
          <Text color="gray.500" fontSize="sm">
            {data[0]?.shares || 0}
          </Text>
        </HStack>

        {/* Label */}
        <Text color="gray.500" fontSize="sm">
          {data[0]?.label || "Label indisponible"}
        </Text>
      </HStack>
    </Box>
  );
}
