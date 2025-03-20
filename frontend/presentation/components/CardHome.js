import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../infrastructure/theme/styles';
import { Box, Text, HStack, VStack, Image, Pressable } from 'native-base';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { faPaperPlane, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View, Platform, Alert, Share, Linking, Animated, TouchableOpacity } from 'react-native';
import BlurredTextComponent from './SelectiveBlurText';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters';
import LinearGradient from 'react-native-linear-gradient';// Ajustez le chemin selon votre structure
import * as Location from 'expo-location';



export default function CardHome({ cardData }) {
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();
  const { data, handleShareSecret } = useCardData();
  const [isSingleLine, setIsSingleLine] = useState(true);
  const [textHeight, setTextHeight] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [locationName, setLocationName] = useState(null);


  // États pour le bouton de partage
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const shareButtonScale = useRef(new Animated.Value(1)).current;

  const safeCardData = {
    user: cardData.user || {},
    content: cardData.content || '',
    label: cardData.label || '',
    expiresAt: cardData.expiresAt,
    location: cardData.location || null  // Ajoutez cette ligne
  };
  
  // Puis dans votre fonction formatLocation
  const formatLocation = () => {
    // Utilisez cardData au lieu de safeCardData
    if (cardData.location?.coordinates) {
      const [longitude, latitude] = cardData.location.coordinates;
      
      // Formater les coordonnées géographiques
      const formattedLng = longitude.toFixed(4);
      const formattedLat = latitude.toFixed(4);
  
      return `${formattedLat}°N, ${formattedLng}°E`;
    }
    return t('cardHome.locationNotShared');
  };
  
  useEffect(() => {
    const fetchLocationName = async () => {
      if (cardData.location?.coordinates) {
        try {
          const [longitude, latitude] = cardData.location.coordinates;
          const reverseGeocode = await Location.reverseGeocodeAsync({ 
            latitude, 
            longitude 
          });

          if (reverseGeocode && reverseGeocode.length > 0) {
            const { city, region, country } = reverseGeocode[0];
            
            // Construire le nom de localisation
            const locationParts = [
              city || region || t('cardHome.unknownLocation'),
              country
            ].filter(Boolean);

            setLocationName(locationParts.join(', '));
          }
        } catch (error) {
          console.error('Erreur de géolocalisation inverse:', error);
          setLocationName(t('cardHome.locationError'));
        }
      }
    };

    fetchLocationName();
  }, [cardData.location]);

  // Ajoutez des logs de débogage
  console.log("Location dans cardData:", cardData.location);
  console.log("Location dans safeCardData:", safeCardData.location);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!safeCardData.expiresAt) return t('cardHome.notAvailable');

      const timeLeftFormatted = dateFormatter.formatTimeLeft(safeCardData.expiresAt);
      return timeLeftFormatted;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, [safeCardData.expiresAt, dateFormatter]);

  useEffect(() => {
    const checkContentLength = () => {
      const content = safeCardData.content || '';
      setIsSingleLine(content.length <= 24);
    };

    checkContentLength();
  }, [safeCardData.content]);

  const profilePictureUrl = safeCardData.user.profilePicture;

  if (!cardData) {
    return <Text>{t('cardHome.noData')}</Text>;
  }

  const handleRevealSecret = () => {
    console.log(t('cardHome.logs.secretRevealed'));
  };

  const handleShare = async () => {
    try {
      // Animation du bouton
      setIsSharing(true);

      // Effet de pression (scale)
      Animated.sequence([
        Animated.timing(shareButtonScale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(shareButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();

      // Feedback haptique
      ReactNativeHapticFeedback.trigger("impactLight", {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });

      // IMPORTANT: Définir secretToShare avant de l'utiliser
      const secretToShare = {
        _id: cardData._id,
        label: cardData.label,
        shareLink: cardData.shareLink || `hushy://secret/${cardData._id}`
      };

      console.log("Secret à partager:", secretToShare); // Vérifier l'objet

      // Ensuite seulement, appeler handleShareSecret
      const result = await handleShareSecret(secretToShare);

      // Gérer le succès du partage
      if (result && result.action === Share.sharedAction) {
        setShareSuccess(true);
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);  // Durée plus courte pour permettre de partager à nouveau rapidement
      }
    } catch (error) {
      console.error("Erreur lors du partage:", error);
      Alert.alert(t('cardHome.errors.title'), t('cardHome.errors.unableToShare'));
    } finally {
      // Important: Toujours réinitialiser isSharing pour permettre de nouveaux partages
      setTimeout(() => {
        setIsSharing(false);
      }, 500);  // Petit délai pour éviter les clics accidentels multiples
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
              {t('cardHome.postedBy', { name: safeCardData.user.name || t('cardHome.anonymous') })}
            </Text>

            {cardData.location?.coordinates && (
              <Text color='#94A3B8' left={2} mt={1} style={styles.littleCaption}>
                {t('cardHome.postedFrom')} {locationName}
              </Text>
            )}
            
            <Text color='#FF78B2' left={2} mt={1} style={styles.littleCaption}>
              {t('cardHome.expiresIn')} {timeLeft}
            </Text>

          </VStack>
          {/* Image alignée à droite */}
          <Image
            source={{
              uri: profilePictureUrl
            }}
            alt={t('cardHome.profilePicture', { name: safeCardData.user.name || t('cardHome.anonymous') })}
            width={35}
            height={35}
            borderRadius="full"
          />
        </HStack>

        {/* Wrapper for the text with blur effect */}
        <Box
          marginLeft={4}
          flex={1}
          height="auto"
          position="relative"
          overflow="hidden"
          justifyContent="center"
          alignItems="center"
        >
          <BlurredTextComponent
            content={cardData.content || t('cardHome.noDescriptionAvailable')}
            style={{ width: '90%', paddingBottom: 5, marginTop: 5, marginLeft: 4 }}
            textStyle={styles.h3}
            breakAtLine={8}
            visibleWords={3}
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
            {cardData.label || t('cardHome.labelUnavailable')}
          </Text>
          {/* Bouton de partage amélioré */}
          <Animated.View style={{ transform: [{ scale: shareButtonScale }] }}>
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
              style={{
                width: 35,
                height: 35,
                borderRadius: 19,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                  },
                  android: {
                    elevation: 3,
                  }
                })
              }}
            >
              <LinearGradient
                colors={shareSuccess ? ['#4CAF50', '#2E7D32'] : ['#FF587E', '#CC4B8D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0
                }}
              />
              <View style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: 1, // Parfois un petit ajustement aide au centrage visuel
                paddingRight: 2   // Ajustement horizontal si nécessaire
              }}>
                <FontAwesomeIcon
                  icon={shareSuccess ? faCheck : faPaperPlane}
                  color="white"
                  size={16}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </HStack>
      </VStack>
    </Box>
  );
}