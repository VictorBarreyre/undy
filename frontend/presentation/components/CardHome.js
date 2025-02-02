import React, { useState, useEffect } from 'react';
import { styles } from '../../infrastructure/theme/styles';
import { Box, Text, HStack, VStack, Image } from 'native-base';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'; // Importer l'icône "share"
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View, Platform, Alert, Share, Linking } from 'react-native';
import BlurredTextComponent from './SelectiveBlurText'


export default function CardHome({ cardData }) {
  const { data } = useCardData(); // Accéder aux données via le contexte
  const [isSingleLine, setIsSingleLine] = useState(true);
  const [textHeight, setTextHeight] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');



  useEffect(() => {
    const calculateTimeLeft = () => {
      const expirationDate = new Date(cardData.expiresAt);
      const now = new Date();
      const difference = expirationDate - now;

      if (difference <= 0) {
        return 'Expiré';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      return `${days}j ${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Mise à jour chaque minute

    return () => clearInterval(timer);
  }, [cardData.expiresAt]);

  const profilePictureUrl = cardData.user?.profilePicture


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
    setTextHeight(event.nativeEvent.layout.height);
  };


  useEffect(() => {
    const checkContentLength = () => {
      // Exemple simple : considérer une chaîne supérieure à 50 caractères comme plus d'une ligne
      if (cardData?.content?.length > 24) {
        setIsSingleLine(false);
      } else {
        setIsSingleLine(true);
      }
    };
    console.log(cardData)

    checkContentLength();
  }, [cardData?.content?.length]);


  return (
    <Box
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
      <VStack height={'100%'} justifyContent="space-between" padding={3} space={2}>

        <HStack alignItems="center" justifyContent="space-between" width="95%">
          {/* Texte aligné à gauche */}
          <VStack flex={1} mr={2} ml={2} >
            <Text left={2} style={styles.caption}>
              Posté par {cardData.user?.name || 'Aucune description disponible.'}
            </Text>
            <Text color='#FF78B2' left={2} mt={1} style={styles.littleCaption}>
              Expire dans {timeLeft}
            </Text>
          </VStack>
          {/* Image alignée à droite */}
          <Image
            source={{
              uri: profilePictureUrl
            }}
            alt={data[0]?.title || 'Carte'}
            width={50} // Ajustez la taille de l'image ici
            height={50} // Ajustez la taille de l'image ici
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
          <BlurredTextComponent
            content={cardData.content || 'Aucune description disponible.'}
            style={{ width: '90%', paddingBottom: 5, marginTop: 5, marginLeft: 4 }}
            textStyle={styles.h2}
            breakAtLine={8}

          />

        </Box>
        {/* Section des statistiques */}
        <HStack
          style={{
            bottom: 0,
            width: '95%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
          mt="auto"
        >
          <Text ml={4} style={[styles.caption, styles.ctalittle]} >
            {cardData.label || 'Label indisponible'}
          </Text>
          <FontAwesomeIcon
            icon={faPaperPlane}
            color="black"
            size={20}
            onPress={handleShare} // Appeler la fonction de partage
          />
        </HStack>

      </VStack>
    </Box>
  );
}
