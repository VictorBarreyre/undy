import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Animated, Easing, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Box, Text, HStack, Image, VStack } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { styles } from '../../infrastructure/theme/styles';
import ImageView from 'react-native-image-viewing';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters'; // Ajustez le chemin selon votre structure

// Composant séparateur de date mémorisé 
const DateSeparator = memo(({ timestamp }) => {
  const dateFormatter = useDateFormatter();
  
  return (
    <Text style={styles.littleCaption} textAlign="center" color="#94A3B8" mb={4} mt={10}>
      {dateFormatter.formatDate(timestamp)}
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
  },
  reply: {
    user: {
      first: { borderRadius: 10, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      middle: { borderRadius: 10, borderTopRightRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      last: { borderRadius: 10, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' }
    },
    other: {
      first: { borderRadius: 10, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      middle: { borderRadius: 10, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      last: { borderRadius: 10, borderTopLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' }
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

// Composant pour afficher la réponse au message
// Dans MessageItem.js, remplacez le composant ReplyPreview par celui-ci

// Composant pour afficher la réponse au message
const ReplyPreview = memo(({ replyToMessage, isUser }) => {
  if (!replyToMessage) return null;
  
  const { t } = useTranslation();
  
  // Préparation du contenu à afficher
  const replyName = replyToMessage.senderInfo?.name || t('chat.defaultUser');
  const replyText = replyToMessage.text && replyToMessage.text.length > 30
    ? `${replyToMessage.text.substring(0, 30)}...`
    : replyToMessage.text || '';
  
  const hasImage = replyToMessage.image && replyToMessage.image.length > 0;
  
  // Couleur de fond en fonction de l'expéditeur
  const bgColor = isUser ? 'rgba(255,88,126,0.1)' : 'rgba(0,0,0,0.05)';
  const textColor = isUser ? 'white' : '#2D3748';
  const nameColor = isUser ? '#FF587E' : '#FF587E';
  
  return (
    <Box pb={1} pt={1} px={2} opacity={0.9}>
      <Box
        bg={bgColor}
        p={1}
        px={2}
        borderRadius={10}
        borderLeftWidth={3}
        borderLeftColor="#FF587E"
      >
        <Text color={nameColor} fontWeight="medium" fontSize={10}>
          {replyName}
        </Text>
        
        <HStack alignItems="center" space={1}>
          {hasImage && (
            <Box
              bg={isUser ? 'rgba(255,255,255,0.2)' : '#F0F0F0'}
              px={1}
              py={0.5}
              borderRadius={4}
              mb={0.5}
            >
              <Text fontSize={9} color={isUser ? 'white' : '#94A3B8'}>📷 {t('chat.image')}</Text>
            </Box>
          )}
          
          {replyText && (
            <Text
              color={textColor}
              fontSize={10}
              numberOfLines={1}
              ellipsizeMode="tail"
              opacity={0.8}
            >
              {replyText}
            </Text>
          )}
        </HStack>
      </Box>
    </Box>
  );
});

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
  showTimestamps,
  onRetryMessage,
  onReplyToMessage
}) => {
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();
  const [showOptions, setShowOptions] = useState(false);
  
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
  
  // Vérifier s'il s'agit d'une réponse
  const isReply = !!item.replyToMessage;

  const renderMessageStatus = () => {
    if (sendFailed) {
      return (
        <HStack alignItems="center" space={2}>
          <Text style={[styles.littleCaption, { color: 'red' }]} mr={2}>
            {t('chat.messageFailed')}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              onRetryMessage && onRetryMessage({
                text: item.text,
                image: item.image,
                messageType: item.messageType,
                replyToMessage: item.replyToMessage
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
              {t('chat.retry')}
            </Text>
          </TouchableOpacity>
        </HStack>
      );
    }
  
    if (isSending) {
      return (
        <Text style={[styles.littleCaption, { color: '#94A3B8' }]} mr={2}>
          {t('chat.sending')}
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
  const getBubbleStyle = useCallback((isTextMessage = true, isReplyBubble = false) => {
    const senderType = isUser ? 'user' : 'other';
    
    if (isReplyBubble) {
      return bubbleStyles.reply[senderType][position];
    }
    
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
  
  // Handler pour répondre à un message
  const handleReply = useCallback(() => {
    if (onReplyToMessage) {
      onReplyToMessage(item);
    }
    setShowOptions(false);
  }, [item, onReplyToMessage]);

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
  
  // Gestionnaire de pression longue pour afficher les options
  const handleLongPress = useCallback(() => {
    if (!isSending && !sendFailed) {
      setShowOptions(true);
    }
  }, [isSending, sendFailed]);

  // Rendu du contenu du message optimisé
  const messageContent = () => {
    const messageComponent = (
      <Pressable onLongPress={handleLongPress}>
        {isReply && item.replyToMessage && (
          <ReplyPreview replyToMessage={item.replyToMessage} isUser={isUser} />
        )}
        
        {hasImage && hasRealText ? (
          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box style={getBubbleStyle(false, isReply)}>
              <MessageImage uri={item.image} onPress={openImageViewer} />
            </Box>

            <Box p={3} style={getBubbleStyle(true, isReply)}>
              <MessageText text={item.text} isUser={isUser} />
            </Box>
          </VStack>
        ) : hasImage ? (
          <Box style={getBubbleStyle(false, isReply)}>
            <MessageImage uri={item.image} onPress={openImageViewer} />
          </Box>
        ) : (
          <Box p={3} style={getBubbleStyle(true, isReply)}>
            <MessageText text={item.text || ''} isUser={isUser} />
          </Box>
        )}
      </Pressable>
    );
    
    // Afficher les options si nécessaire
    if (showOptions) {
      return (
        <VStack>
          {messageComponent}
          
          <Box 
            position="absolute" 
            top={-40} 
            left={isUser ? 10 : 50}
            right={isUser ? 50 : 10}
            px={1}
            py={1}
            bg="#1E1E1E"
            borderRadius={20}
            zIndex={100}
            shadow={3}
          >
            <HStack space={2} justifyContent="center" alignItems="center">
              <TouchableOpacity 
                onPress={handleReply}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRightWidth: 1,
                  borderRightColor: "#444444"
                }}
              >
                <Text color="#FF587E" fontSize="xs">
                  {t('chat.messageOptions.reply')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowOptions(false)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6
                }}
              >
                <Text color="white" fontSize="xs">
                  {t('chat.messageOptions.cancel')}
                </Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </VStack>
      );
    }
    
    return messageComponent;
  };

  return (
    <HStack
      width="100%"
      justifyContent="space-between"
      alignItems="flex-end"
      my={0.2}
      mb={isLastMessage ? 4 : 0}  // Add extra bottom margin only for the last message
      px={2}
      opacity={messageOpacity}
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
                {item.senderInfo?.name || t('chat.defaultUser')}
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
            {dateFormatter.formatTimeOnly(item.timestamp)}
          </Animated.Text>
        </Animated.View>
      )}
    </HStack>
  );
}, (prevProps, nextProps) => {
  // Fonction de comparaison optimisée pour React.memo
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.image === nextProps.item.image &&
    prevProps.userData?._id === nextProps.userData?._id &&
    prevProps.showOptions === nextProps.showOptions &&
    true
  );
});

export default MessageItem;