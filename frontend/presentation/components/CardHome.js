import React from 'react';
import { styles } from '../../infrastructure/theme/styles';
import { Box, Text, HStack, VStack, Image, Button } from 'native-base';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome5 } from '@expo/vector-icons';
import { faHeart, faComment, faPaperPlane } from '@fortawesome/free-regular-svg-icons'; // Import des icônes "vides"
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View } from 'native-base';




export default function CardHome() {
  const { data } = useCardData(); // Accéder aux données via le contexte

  if (!data || data.length === 0) {
    return <Text>No data available</Text>;
  }

  const handleRevealSecret = () => {
    console.log('Secret revealed!');
  };

  return (
    <Box
      display="flex" // Utilise le modèle Flexbox
      width="100%"
      height="auto"
      marginX="auto"
      borderRadius="lg"
      overflow="hidden"
      backgroundColor="white"
      marginTop={2}
      shadow={10}
      paddingTop={1}
      paddingBottom={1}
      
    >
      {/* Contenu texte */}
      <VStack padding={4} space={2}>
             <HStack mt={1} alignItems="center" justifyContent="space-between" width="95%">
          {/* Texte aligné à gauche */}
          <Box flex={1} mr={4} ml={2} >
            <Text left={2} style={styles.h5}>
            Posté par {data[0]?.posterpar || 'Aucune description disponible.'}
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
          {/* Texte */}
          <Text    ellipsizeMode="tail" top="1" left="2" paddingBottom="2" width="95%" style={styles.h3}>
            {`"${data[0]?.description || 'Aucune description disponible.'}"`}
          </Text>

          {/* Overlay avec flou */}
          <BlurView
            style={styles.overlayCard}
            blurType="light"
            blurAmount={5}
            backgroundColor='rgba(255, 255, 255, 0.6)'
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
          />

          {/* Bouton centré */}
          <Button
            width='80%'
            zIndex="5"
            onClick={handleRevealSecret}
            variant="primary"
            style={{ position: 'absolute', bottom: 50, }} // Optionnel : place le bouton en bas
          >
            Dévoiler le secret pour 2$
          </Button>
        </Box>

   
   {/* Section des statistiques */}
   <View ml={4} style={[styles.statsContainer]}>
        {/* Conteneur des icônes des statistiques */}
        <View style={[styles.row, styles.stats]}>
          {/* Statistiques : likes */}
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faHeart} color="#FF5A7D" size={20} />
            <Text style={styles.caption} ml={2}>
              {data[0]?.likes || 0}
            </Text>
          </View>

          {/* Statistiques : commentaires */}
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faComment} color="#FF5A7D" size={20} />
            <Text style={styles.caption} ml={2}>
              {data[0]?.comments || 0}
            </Text>
          </View>

          {/* Statistiques : partages */}
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faPaperPlane} color="#FF5A7D" size={20} />
            <Text style={styles.caption} ml={2}>
              {data[0]?.shares || 0}
            </Text>
          </View>
        </View>

        {/* Label aligné à droite */}
        <Text style={[styles.caption, styles.ctalittle]} >
          {data[0]?.label || 'Label indisponible'}
        </Text>
      </View>

      </VStack>

   
    </Box>
  );
}

