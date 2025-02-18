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

  const safeCardData = cardData || {};

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!safeCardData.expiresAt) return 'N/A';

      const expirationDate = new Date(safeCardData.expiresAt);
      const now = new Date();
      const difference = expirationDate - now;

      if (difference <= 0) return 'Expiré';

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      return `${days}j ${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, [safeCardData.expiresAt]);


  useEffect(() => {
    const checkContentLength = () => {
      const content = safeCardData.content || '';
      setIsSingleLine(content.length <= 24);
    };

    checkContentLength();
  }, [safeCardData.content]);


  const profilePictureUrl = cardData.user?.profilePicture


  if (!data || data.length === 0) {
    return <Text>No data available</Text>;
  }

  const handleRevealSecret = () => {
    console.log('Secret revealed!');
  };

  const handleShare = async () => {
    try {
        // Appel à l'API pour obtenir/générer le lien de partage
        const response = await fetch(`${API_URL}/api/secrets/${cardData._id}/share`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${yourAuthToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.shareLink) {
            const shareMessage = Platform.select({
                ios: `Découvre ce secret sur Hushy!\n${data.shareLink}`,
                android: `Découvre ce secret sur Hushy!\n${data.shareLink}\n\nTélécharge l'app: https://play.google.com/store/apps/details?id=com.hushy`
            });

            const result = await Share.share({
                message: shareMessage,
                url: data.shareLink // iOS only
            });

            if (result.action === Share.sharedAction) {
                console.log('Secret partagé avec succès');
            }
        }
    } catch (error) {
        console.error('Erreur lors du partage:', error);
        Alert.alert('Erreur', 'Impossible de partager le secret.');
    }
};


  const handleTextLayout = (event) => {
    setTextHeight(event.nativeEvent.layout.height);
  };



  return (
    <Box
      width="100%"
      marginX="auto"
      height='100%'
      borderRadius="lg"
      overflow="hidden"
      backgroundColor="white"
      marginTop={1}
      shadow={10}
      paddingTop={1}
      paddingBottom={4}
      justifyContent="space-between"
    >
      {/* Contenu texte */}
      <VStack height={'100%'} justifyContent="space-between" padding={3} space={2} flex={1} >

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
            width={35} // Ajustez la taille de l'image ici
            height={35} // Ajustez la taille de l'image ici
            borderRadius="full" // Rendre l'image ronde
          />
        </HStack>

        {/* Wrapper for the text with blur effect */}
        <Box
        marginLeft={4}
          flex={1} // Ajout
          height="auto"
          position="relative"
          overflow="hidden"
          justifyContent="center" // Centre verticalement les enfants
          alignItems="center" // Centre horizontalement les enfants
        >
          <BlurredTextComponent
            content={cardData.content || 'Aucune description disponible.'}
            style={{ width: '90%', paddingBottom: 5, marginTop: 5, marginLeft: 4 }}
            textStyle={styles.h3}
            breakAtLine={8}
            visibleWords={3}  // Montre les 3 premiers mots
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
