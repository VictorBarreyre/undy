import React, {useState, useEffect} from 'react';
import { styles } from '../../infrastructure/theme/styles';
import { Box, Text, HStack, VStack, Image, Button } from 'native-base';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'; // Importer l'icône "share"
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View, Platform, Alert, Share, Linking } from 'react-native';

export default function CardHome({ cardData }) {
  const { data } = useCardData(); // Accéder aux données via le contexte
  const [isSingleLine, setIsSingleLine] = useState(true);


  if (!data || data.length === 0) {
    return <Text>No data available</Text>;
  }

  const handleRevealSecret = () => {
    console.log('Secret revealed!');
  };

  const handleShare = async () => {
    const secretUrl = `https://myapp.com/secret/${data[0]?.id}`;
    const appScheme = 'myapp://secret/';
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id123456789' // Remplacez par votre ID App Store
        : 'https://play.google.com/store/apps/details?id=com.myapp'; // Remplacez par votre package Play Store

    try {
      // Vérifie si l'application est installée
      const isAppInstalled = await Linking.canOpenURL(appScheme);

      if (isAppInstalled) {
        // Ouvre l'application avec l'URL du secret
        Linking.openURL(`${appScheme}${data[0]?.id}`);
      } else {
        // Partage le lien ou redirige vers le store
        const result = await Share.share({
          message: `Découvrez ce secret : ${secretUrl}`,
          url: secretUrl, // Partage également l'URL
        });

        if (result.action === Share.dismissedAction) {
          // Si annulé, propose de rediriger vers le store
          Alert.alert(
            'Téléchargez notre application',
            'Pour profiter pleinement, téléchargez notre application.',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Télécharger', onPress: () => Linking.openURL(storeUrl) },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };


  const handleTextLayout = (event) => {
    const { height } = event.nativeEvent.layout;

    // Supposons que la hauteur d'une ligne est de 20 (à ajuster selon votre style)
    const isSingle = height <= 1;
    setIsSingleLine(isSingle);
  };


  useEffect(() => {
    const checkContentLength = () => {
      // Exemple simple : considérer une chaîne supérieure à 50 caractères comme plus d'une ligne
      if (cardData?.content?.length > 20) {
        setIsSingleLine(false);
      } else {
        setIsSingleLine(true);
      }
    };

    checkContentLength();
  }, [cardData]);


  return (
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
              Posté par {cardData.user?.name || 'Aucune description disponible.'}
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
          <Text ellipsizeMode="tail" top="5" left="2" paddingBottom="5" width="95%" style={styles.h2}>
            {`"${cardData.content || 'Aucune description disponible.'}"`}
          </Text>

          {/* Overlay avec flou */}
          <BlurView
            style={[styles.overlayCard, { top: isSingleLine ? 0 : 58 }]} // Change la valeur de top dynamiquement
            blurType="light"
            blurAmount={4}
            backgroundColor='rgba(255, 255, 255, 0.6)'
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
          />

          {/* Bouton centré */}
        </Box>

        {/* Section des statistiques */}
        <View style={[styles.statsContainer]}>

          <Text  ml={4} style={[styles.caption, styles.ctalittle]} >
            {cardData.label || 'Label indisponible'}
          </Text>

          {/* Conteneur des icônes des statistiques */}
          <View style={[styles.row, styles.stats]}>
            {/* Statistiques : partages */}
            <View style={styles.iconContainer}>
              <FontAwesomeIcon
                icon={faPaperPlane}
                color="black"
                size={20}
                onPress={handleShare} // Appeler la fonction de partage
              />
            </View>
          </View>

        </View>

      </VStack>
    </Box>
  );
}
