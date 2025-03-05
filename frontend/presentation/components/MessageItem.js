import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Animated, Easing, TouchableOpacity } from 'react-native';
import { Box, Text, HStack, Image, VStack } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { styles } from '../../infrastructure/theme/styles';
import ImageView from 'react-native-image-viewing';

// Fonction formatage de temps importée du ChatScreen - Optimisée avec cache
const timeFormatCache = new Map();
const formatMessageTime = (timestamp, showFullDate = false, showTimeOnly = false) => {
  if (!timestamp) return '';

  // Créer une clé de cache basée sur les paramètres
  const cacheKey = `${timestamp}_${showFullDate}_${showTimeOnly}`;

  // Vérifier si le résultat est dans le cache
  if (timeFormatCache.has(cacheKey)) {
    return timeFormatCache.get(cacheKey);
  }

  try {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let result = '';

    if (showTimeOnly) {
      result = messageDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (showFullDate) {
      if (messageDate.toDateString() === today.toDateString()) {
        result = `Aujourd'hui, ${messageDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        result = `Hier, ${messageDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      } else {
        result = messageDate.toLocaleString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } else {
      if (messageDate.toDateString() === today.toDateString()) {
        result = 'Aujourd\'hui';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        result = 'Hier';
      } else {
        result = messageDate.toLocaleString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
      }
    }

    // Stocker le résultat dans le cache
    timeFormatCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return '';
  }
};

// Séparateur de date mémorisé pour éviter les re-renders inutiles
const DateSeparator = memo(({ timestamp }) => {
  return (
    <Text style={styles.littleCaption} textAlign="center" color="#94A3B8" mb={4} mt={10}>
      {formatMessageTime(timestamp, true)}
    </Text>
  );
});

// Styles précalculés pour éviter de les recréer à chaque rendu
const bubbleStyles = {
  user: {
    first: {
      borderRadius: 20,
      borderBottomRightRadius: 3,
      marginBottom: 1,
      overflow: 'hidden'
    },
    middle: {
      borderRadius: 20,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      marginVertical: 1,
      overflow: 'hidden'
    },
    last: {
      borderRadius: 20,
      borderTopRightRadius: 3,
      marginTop: 1,
      overflow: 'hidden'
    },
    single: {
      borderRadius: 20,
      overflow: 'hidden'
    }
  },
  other: {
    first: {
      borderRadius: 20,
      borderBottomLeftRadius: 3,
      marginBottom: 1,
      overflow: 'hidden'
    },
    middle: {
      borderRadius: 20,
      borderTopLeftRadius: 3,
      borderBottomLeftRadius: 3,
      marginVertical: 1,
      overflow: 'hidden'
    },
    last: {
      borderRadius: 20,
      borderTopLeftRadius: 3,
      marginTop: 1,
      overflow: 'hidden'
    },
    single: {
      borderRadius: 20,
      overflow: 'hidden'
    }
  },
  image: {
    user: {
      first: { borderRadius: 10, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      middle: { borderRadius: 10, borderTopRightRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      last: { borderRadius: 10, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent' }
    },
    other: {
      first: { borderRadius: 10, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      middle: { borderRadius: 10, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      last: { borderRadius: 10, borderTopLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent' }
    }
  }
};

// Composant image mémorisé pour éviter les re-renders inutiles
const MessageImage = memo(({ uri, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
  >
    <Image
      alt="Message image"
      source={{ uri }}
      style={{
        width: 150,
        height: 150,
      }}
      resizeMode="cover"
    />
  </TouchableOpacity>
));

// Composant texte mémorisé
const MessageText = memo(({ text, isUser }) => (
  <>
    {isUser ? (
      <LinearGradient
        colors={['#FF587E', '#CC4B8D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
    ) : (
      <Box
        bg='#FFFFFF'
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
    )}
    <Text color={isUser ? 'white' : 'black'} style={styles.caption}>
      {text}
    </Text>
  </>
));

// Composant avatar mémorisé
const Avatar = memo(({ source }) => (
  <Image
    source={source}
    alt="Profile"
    size={8}
    rounded="full"
  />
));

// Fonction pour déterminer la position du message dans une séquence
const getMessagePosition = (index, messages) => {
  const safeIndex = (idx) => idx >= 0 && idx < messages.length ? idx : -1;

  const prevIndex = safeIndex(index - 1);
  const nextIndex = safeIndex(index + 1);

  const isPreviousSameSender = prevIndex !== -1 &&
    messages[prevIndex].sender === messages[index].sender &&
    messages[prevIndex].type !== 'separator';

  const isNextSameSender = nextIndex !== -1 &&
    messages[nextIndex].sender === messages[index].sender &&
    messages[nextIndex].type !== 'separator';

  if (isPreviousSameSender && isNextSameSender) return 'middle';
  if (isPreviousSameSender) return 'last';
  if (isNextSameSender) return 'first';
  return 'single';
};

const MessageItem = memo(({
  item,
  index,
  messages,
  userData,
  showTimestamps
}) => {
  // Protection contre les valeurs null/undefined
  if (!item) return null;

  // Si c'est un séparateur de date, on affiche uniquement la date
  if (item.type === 'separator') {
    return <DateSeparator timestamp={item.timestamp} />;
  }

  const isLastMessage = index === messages.length - 1;


  const timestampAnimation = useRef(new Animated.Value(showTimestamps ? 1 : 0)).current;
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const isSending = !!item.isSending;
  const sendFailed = !!item.sendFailed;


  const messageOpacity = isSending ? 0.7 : 1;

  const renderMessageStatus = () => {
    if (sendFailed) {
      return (
        <HStack alignItems="center" space={2}>
          <Text style={[styles.littleCaption, { color: 'red' }]} mr={2}>
            Échec
          </Text>
          <TouchableOpacity 
            onPress={() => {
              onRetryMessage && onRetryMessage({
                text: item.text,
                image: item.image,
                messageType: item.messageType
              });
            }}
          >
            <Text 
              style={[
                styles.littleCaption, 
                { 
                  color: 'red', 
                  textDecorationLine: 'underline' 
                }
              ]}
            >
              Renvoyer
            </Text>
          </TouchableOpacity>
        </HStack>
      );
    }
  
    if (isSending) {
      return (
        <Text style={[styles.littleCaption, { color: '#94A3B8' }]} mr={2}>
          Envoi...
        </Text>
      );
    }
  
    return null;
  };

  useEffect(() => {
    Animated.timing(timestampAnimation, {
      toValue: showTimestamps ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true
    }).start();
  }, [showTimestamps, timestampAnimation]);

  // Calculer la position une seule fois
  const position = getMessagePosition(index, messages);
  const showAvatar = position === 'single' || position === 'last';

  // Vérifier si le message a du texte et/ou une image de manière sécurisée
  const hasRealText = item.text && typeof item.text === 'string' && item.text.trim().length > 0 && item.text.trim() !== " ";
  const hasImage = item.image && typeof item.image === 'string' && item.image.length > 0;

  // Utiliser les styles précalculés
  const isUser = item.sender === 'user';
  const getBubbleStyle = useCallback((isTextMessage = true) => {
    const senderType = isUser ? 'user' : 'other';
    return isTextMessage ? bubbleStyles[senderType][position] : bubbleStyles.image[senderType][position];
  }, [isUser, position]);

  // Animation pour les horodatages
  const timestampOpacity = timestampAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const timestampWidth = timestampAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
    extrapolate: 'clamp'
  });

  // Handler pour l'ouverture de la visionneuse d'images
  const openImageViewer = useCallback(() => {
    setIsImageViewVisible(true);
  }, []);

  // Handler pour la fermeture de la visionneuse d'images
  const closeImageViewer = useCallback(() => {
    setIsImageViewVisible(false);
  }, []);

  // Préparer le contenu de l'avatar une seule fois
  const avatarContent = useCallback(() => {
    if (!showAvatar) return <Box size={8} opacity={0} />;

    let imageSource = require('../../assets/images/default.png');

    if (isUser) {
      if (userData?.profilePicture) {
        imageSource = { uri: userData.profilePicture };
      }
    } else if (item.senderInfo?.profilePicture) {
      imageSource = { uri: item.senderInfo.profilePicture };
    }

    return <Avatar source={imageSource} />;
  }, [showAvatar, isUser, userData, item.senderInfo]);

  // Rendu du contenu du message optimisé
  const messageContent = () => {
    if (hasImage && hasRealText) {
      return (
        <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
          <Box style={getBubbleStyle(false)}>
            <MessageImage uri={item.image} onPress={openImageViewer} />
          </Box>

          <Box p={3} style={getBubbleStyle(true)}>
            <MessageText text={item.text} isUser={isUser} />
          </Box>
        </VStack>
      );
    } else if (hasImage) {
      return (
        <Box style={getBubbleStyle(false)}>
          <MessageImage uri={item.image} onPress={openImageViewer} />
        </Box>
      );
    } else {
      return (
        <Box p={3} style={getBubbleStyle(true)}>
          <MessageText text={item.text || ''} isUser={isUser} />
        </Box>
      );
    }
  };

  return (
    <HStack
      width="100%"
      justifyContent="space-between"
      alignItems="flex-end"
      my={0.2}
      mb={isLastMessage ? 4 : 0}  // Add extra bottom margin only for the last message
      px={2}
      opacity={messageOpacity}  // Ajouter cette propriété
    >
      <HStack
        flex={1}
        justifyContent={isUser ? 'flex-end' : 'flex-start'}
        alignItems="flex-end"
        space={1}
      >
        {!isUser && avatarContent()}

        <VStack
          maxWidth="80%"
          alignItems={isUser ? 'flex-end' : 'flex-start'}
        >
          {!isUser && (position === 'first' || position === 'single') && (
            <HStack alignItems="center">
              <Text
                style={styles.littleCaption}
                color="#94A3B8"
                ml={2}
                mb={1}
              >
                {item.senderInfo?.name || 'Utilisateur'}
              </Text>
              {renderMessageStatus()}
            </HStack>
          )}

          {isUser && (
            <HStack alignItems="center" >
              {renderMessageStatus()}
            </HStack>
          )}

          {messageContent()}
        </VStack>

        {isUser && avatarContent()}
      </HStack>

      {hasImage && (
        <ImageView
          images={[{ uri: item.image }]}
          imageIndex={0}
          visible={isImageViewVisible}
          onRequestClose={closeImageViewer}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />
      )}

      {showTimestamps && (
        <Animated.View
          style={{
            opacity: timestampOpacity,
            alignItems: 'flex-end'
          }}
        >
          <Animated.Text
            style={[
              styles.littleCaption,
              {
                color: '#94A3B8',
                fontSize: 10,
                marginBottom: 6,
                marginRight: 10,
                transform: [{ translateX: timestampWidth }]
              }
            ]}
          >
            {formatMessageTime(item.timestamp, false, true)}
          </Animated.Text>
        </Animated.View>
      )}
    </HStack>
  );
}, (prevProps, nextProps) => {
  // Fonction de comparaison optimisée pour React.memo
  // Retourne true si les props n'ont pas changé de manière significative
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.image === nextProps.item.image &&
    prevProps.userData?._id === nextProps.userData?._id &&
    // Les autres props comme index et messages ne devraient pas changer fréquemment
    true
  );
});

export default MessageItem;