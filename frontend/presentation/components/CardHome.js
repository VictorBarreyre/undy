import React, { useState, useEffect } from 'react';
import { styles } from '../../infrastructure/theme/styles';
import { Box, Text, HStack, VStack, Image } from 'native-base';
import { BlurView } from '@react-native-community/blur';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View, Platform, Alert, Share, Linking } from 'react-native';
import BlurredTextComponent from './SelectiveBlurText';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters'; // Ajustez le chemin selon votre structure

export default function CardHome({ cardData }) {
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();
  const { data } = useCardData();
  const [isSingleLine, setIsSingleLine] = useState(true);
  const [textHeight, setTextHeight] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  const safeCardData = {
    user: cardData.user || {},
    content: cardData.content || '',
    label: cardData.label || '',
    expiresAt: cardData.expiresAt,
    // autres propriétés nécessaires
  };

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

  if (!data || data.length === 0) {
    return <Text>{t('cardHome.noData')}</Text>;
  }

  const handleRevealSecret = () => {
    console.log(t('cardHome.logs.secretRevealed'));
  };

  const handleShare = async () => {
    try {
      await handleShareSecret(cardData);
    } catch (error) {
      Alert.alert(t('cardHome.errors.title'), t('cardHome.errors.unableToShare'));
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
          <FontAwesomeIcon
            icon={faPaperPlane}
            color="black"
            size={20}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          />
        </HStack>
      </VStack>
    </Box>
  );
}