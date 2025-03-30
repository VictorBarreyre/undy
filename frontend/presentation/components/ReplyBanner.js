// Dans ReplyBanner.js
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { HStack, VStack, Text, Box, Image } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faReply } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';

const ReplyBanner = ({ replyToMessage, onCancelReply }) => {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de sortie quand le composant est démonté
    return () => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };
  }, []);

  if (!replyToMessage) return null;

  const replyName = replyToMessage.senderInfo?.name || t('chat.defaultUser');
  const replyText = replyToMessage.text && replyToMessage.text.length > 25
    ? `${replyToMessage.text.substring(0, 25)}...`
    : replyToMessage.text || '';
  const hasImage = replyToMessage.image && typeof replyToMessage.image === 'string' && replyToMessage.image.length > 0;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: fadeAnim,
        marginBottom: 8,
        marginTop: 2,
      }}
    >
      <Box
        bg="#F8F9FA"
        borderRadius={15}
        borderLeftWidth={3}
        borderLeftColor="#FF587E"
        overflow="hidden"
      >
        <HStack alignItems="center" space={2} p={2}>
          {/* Indicateur de réponse */}
          <Box
            bg="rgba(251, 251, 251, 0.1)"
            p={2}
            borderRadius={12}
          >
            <FontAwesomeIcon icon={faReply} size={16} color="#FF587E" />
          </Box>
          
          {/* Contenu de la réponse */}
          <VStack flex={1} space={0}>
            <Text style={styles.caption} color="#FF587E" fontWeight="600">
              {t('chat.replyingTo')} {replyName}
            </Text>
            
            <HStack alignItems="center" space={2} flex={1}>
              {hasImage && (
                <Box
                  width={6}
                  height={6}
                  borderRadius={4}
                  overflow="hidden"
                  mr={1}
                >
                  <Image
                    source={{ uri: replyToMessage.image }}
                    alt="thumbnail"
                    size="xs"
                    resizeMode="cover"
                  />
                </Box>
              )}
              
              <Text
                style={styles.littleCaption}
                color="#94A3B8"
                numberOfLines={1}
                flex={1}
              >
                {hasImage && !replyText ? t('chat.photo') : replyText}
              </Text>
            </HStack>
          </VStack>
          
          {/* Bouton pour annuler la réponse */}
          <TouchableOpacity
            onPress={onCancelReply}
            hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
          >
            <LinearGradient
              colors={['#FF587E', '#CC4B8D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <FontAwesomeIcon icon={faTimes} size={12} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </HStack>
      </Box>
    </Animated.View>
  );
};

export default ReplyBanner;