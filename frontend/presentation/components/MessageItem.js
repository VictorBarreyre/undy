import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Animated, Easing, TouchableOpacity, Pressable, Linking } from 'react-native';
import { Box, Text, HStack, Image, VStack } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faReply, faCopy, faShare, faTimes, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';
import ImageView from 'react-native-image-viewing';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters';
import LinkPreview from './embed/LinkPreview';

// Composant séparateur de date mémorisé 
const DateSeparator = memo(({ timestamp }) => {
  const dateFormatter = useDateFormatter();

  return (
    <Text style={styles.littleCaption} textAlign="center" color="#94A3B8" mb={4} mt={10}>
      {dateFormatter.formatDate(timestamp)}
    </Text>
  );
});

// Composant pour afficher la réponse au message
const ReplyPreview = memo(({ replyToMessage, isUser }) => {
  if (!replyToMessage) return null;

  const { t } = useTranslation();

  // Préparation du contenu
  const replyName = replyToMessage.senderInfo?.name || t('chat.defaultUser');
  const replyText = replyToMessage.text && replyToMessage.text.length > 30
    ? `${replyToMessage.text.substring(0, 30)}...`
    : replyToMessage.text || '';

  const hasImage = replyToMessage.image && typeof replyToMessage.image === 'string' && replyToMessage.image.length > 0;

  // Variables de style modernisées
  const bgColor = isUser ? 'rgba(255,88,126,0.08)' : 'rgba(0,0,0,0.03)';
  const textColor = isUser ? 'white' : '#2D3748';
  const nameColor = '#FF587E';

  return (
    <Box pb={1} mb={1}>
      <Box
        bg={bgColor}
        p={2}
        borderRadius={10}
        borderLeftWidth={2}
        borderLeftColor={nameColor}
        width="100%"
      >
        <HStack alignItems="center" space={1} mb={0.5}>
          <Box
            width={3}
            height={3}
            bg={nameColor}
            borderRadius={10}
            mr={1}
          />
          <Text color={nameColor} fontWeight="600" fontSize={10}>
            {replyName}
          </Text>
        </HStack>

        <HStack alignItems="center" space={1}>
          {hasImage && (
            <Box
              bg={isUser ? 'rgba(255,255,255,0.2)' : '#F0F0F0'}
              px={1.5}
              py={0.5}
              borderRadius={4}
              mb={0.5}
              alignItems="center"
              flexDirection="row"
            >
              <Text fontSize={9} color={isUser ? 'white' : '#94A3B8'}>📷</Text>
            </Box>
          )}

          {replyText && (
            <Text
              color={textColor}
              fontSize={11}
              numberOfLines={1}
              ellipsizeMode="tail"
              opacity={0.9}
            >
              {replyText}
            </Text>
          )}
        </HStack>
      </Box>
    </Box>
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
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  const [menuPosition, setMenuPosition] = useState('bottom');
  const messageRef = useRef(null);

  // Protection contre les valeurs null/undefined
  if (!item) return null;

  // Si c'est un séparateur de date, on affiche uniquement la date
  if (item.type === 'separator') {
    return <DateSeparator timestamp={item.timestamp} />;
  }

  const isLastMessage = index === messages.length - 1;

  // Animations
  const timestampAnimation = useRef(new Animated.Value(showTimestamps ? 1 : 0)).current;
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const shadowAnimation = useRef(new Animated.Value(0)).current;

  const isSending = !!item.isSending;
  const sendFailed = !!item.sendFailed;
  const messageOpacity = isSending ? 0.7 : 1;

  // Vérifier s'il s'agit d'une réponse
  const isReply = !!item.replyToMessage;

  // Animation de mise en évidence pour les messages sélectionnés pour réponse
  useEffect(() => {
    if (item.isHighlighted) {
      // Animation de pulsation
      Animated.sequence([
        Animated.timing(highlightAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false
        }),
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        })
      ]).start();
    }
  }, [item.isHighlighted]);

  // Animation pour l'ombre lorsque le menu contextuel est affiché
  useEffect(() => {
    if (showOptions) {
      // Animer l'apparition de l'ombre
      Animated.timing(shadowAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false // Native driver ne supporte pas les ombres
      }).start();
    } else {
      // Faire disparaître l'ombre
      Animated.timing(shadowAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false
      }).start();
    }
  }, [showOptions]);

  // Couleur d'arrière-plan pour la mise en évidence
  const bgHighlight = highlightAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', item.sender === 'user' ? 'rgba(255,88,126,0.15)' : 'rgba(0,0,0,0.05)']
  });

  // Animation des horodatages
  useEffect(() => {
    Animated.timing(timestampAnimation, {
      toValue: showTimestamps ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true
    }).start();
  }, [showTimestamps]);

  // Gestionnaire pour le menu contextuel
  const handleLongPress = useCallback(() => {
    if (!isSending && !sendFailed) {
      // Déterminer si on est proche de la fin de la liste
      const isNearEnd = index >= messages.length - 3; // Considérer les 3 derniers messages comme "près de la fin"

      // Si on est près de la fin, afficher au-dessus
      const menuPlacement = isNearEnd ? 'top' : 'bottom';

      setMenuPosition(menuPlacement);
      setShowOptions(true);

      // Animer l'apparition
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [isSending, sendFailed, index, messages.length]);

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(shadowAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false
      })
    ]).start(() => {
      setShowOptions(false);
    });
  };

  // Handler pour répondre à un message
  const handleReply = useCallback(() => {
    if (onReplyToMessage) {
      onReplyToMessage(item);
    }
    closeMenu();
  }, [item, onReplyToMessage]);

  // Gestionnaire pour l'état du message
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

  // Handler pour l'ouverture de la visionneuse d'images
  const openImageViewer = useCallback(() => {
    setIsImageViewVisible(true);
  }, []);

  // Handler pour la fermeture de la visionneuse d'images
  const closeImageViewer = useCallback(() => {
    setIsImageViewVisible(false);
  }, []);

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

  // Animation pour l'ombre
  const shadowElevation = shadowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5]
  });

  const shadowOpacity = shadowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.2]
  });

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

  // Rendu du menu contextuel
  const renderContextMenu = () => {
    if (!showOptions) return null;

    const translateY = menuAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: menuPosition === 'bottom' ? [10, 0] : [-10, 0]
    });

    // Styles de position selon qu'on affiche en haut ou en bas
    const positionStyles = {
      top: menuPosition === 'bottom' ? '100%' : 'auto',
      bottom: menuPosition === 'top' ? '100%' : 'auto',
      marginTop: menuPosition === 'bottom' ? 5 : 0,
      marginBottom: menuPosition === 'top' ? 5 : 0,
    };

    return (
      <Animated.View
        style={{
          position: "absolute",
          top: -70,  // Toujours en dessous
          marginTop: 10,
          left: isUser ? 60 : 40,
          right: 20,
          backgroundColor: "white",
          borderRadius: 12,
          padding: 10,
          opacity: menuAnimation,
          zIndex: 1000,
          shadowColor: "#8A2BE2",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.01,
          shadowRadius: 4,
          elevation: 2,
          width: 'content',
          alignSelf: 'flex-start',
          flexDirection: "row",
          width: '78%'
        }}
      >
        {/* Petit triangle pointant vers le message */}
        <Box
          style={{
            position: 'absolute',
            bottom: -8,
            left: isUser ? '95%' : '5%', // Position différente selon l'expéditeur
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: 8,
            borderRightWidth: 8,
            borderBottomWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: "white",
            transform: [{ rotate: '180deg' }],

          }}
        />
        <TouchableOpacity
          onPress={handleReply}
          style={{
            padding: 8,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12
          }}
        >
          <FontAwesomeIcon icon={faReply} size={14} color="#94A3B8" />
          <Text style={styles.littleCaption} color="#94A3B8" fontSize="xs" ml={2} fontWeight="medium">
            Répondre
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Logique pour copier le texte
            closeMenu();
          }}
          style={{
            padding: 8,
            marginLeft: 8,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12
          }}
        >
          <FontAwesomeIcon icon={faCopy} size={14} color="#94A3B8" />
          <Text style={styles.littleCaption} color="#94A3B8" fontSize="xs" ml={2}>
            Copier
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={closeMenu}
          style={{
            padding: 8,
            marginLeft: 8,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12
          }}
        >
          <FontAwesomeIcon icon={faTimes} size={14} color="#94A3B8" />
          <Text style={styles.littleCaption} color="#94A3B8" fontSize="xs" ml={2}>
            Annuler
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const messageContent = () => {
    // Extraction des URLs du texte pour les embeds
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const embedUrls = (item.text || '').match(urlRegex) || [];
    const hasEmbeds = embedUrls.length > 0;

    // Retirer les URLs du texte à afficher
    let cleanText = item.text || '';
    if (hasEmbeds) {
      // Si le message contient uniquement des URLs, définir cleanText comme vide
      const textWithoutUrls = embedUrls.reduce((text, url) => text.replace(url, ''), cleanText).trim();

      // Si après suppression des URLs, il reste uniquement des espaces ou rien,
      // considérer qu'il n'y a pas de "vrai" texte
      cleanText = textWithoutUrls.length > 0 ? textWithoutUrls : '';
    }

    // Vérifier s'il reste du texte après avoir retiré les URLs
    const hasCleanText = cleanText.length > 0;

    // Vérifier si le message contient un audio
    const hasAudio = item.messageType === 'audio' && item.audio;

    // Fonction pour rendre les embeds
    const renderEmbeds = () => {
      return embedUrls.map((url, index) => (
        <Box
          key={`${url}-${index}`}
          mt={hasCleanText ? 2 : 0} // Ajouter une marge supérieure seulement s'il y a du texte
          width="full"
          alignSelf={isUser ? 'flex-end' : 'flex-start'}
        >
          <LinkPreview url={url} onPress={() => Linking.openURL(url)} isUser={isUser} />
        </Box>
      ));
    };

    // Composant pour afficher le lecteur audio
    const AudioPlayer = ({ uri, duration = "00:00" }) => {
      const [isPlaying, setIsPlaying] = useState(false);
      const [playbackPosition, setPlaybackPosition] = useState(0);
      const [playbackDuration, setPlaybackDuration] = useState(duration);
      const soundRef = useRef(null);
      const intervalRef = useRef(null); // Pour stocker la référence à l'intervalle

      const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      };

      useEffect(() => {
        const checkAudioURL = async () => {
          if (uri) {
            try {
              const response = await fetch(uri, { method: 'HEAD' });
              if (!response.ok) {
                console.warn(`L'URL audio n'est pas accessible: ${uri}`);
                // Logique pour gérer l'URL non accessible
              }
            } catch (error) {
              console.error('Erreur lors de la vérification de l\'URL audio:', error);
            }
          }
        };
        
        checkAudioURL();
      }, [uri]);
      
      // Nettoyage lorsque le composant est démonté
      useEffect(() => {
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          if (soundRef.current) {
            soundRef.current.release();
          }
        };
      }, []);

      const handlePlayPause = async () => {
        if (!soundRef.current) {
          // Initialiser le son
          const Sound = require('react-native-sound');
          Sound.setCategory('Playback');
          
          console.log("Tentative de lecture de l'audio:", uri);
          
          const sound = new Sound(uri, null, (error) => {
            if (error) {
              console.log('Erreur lors du chargement du son', error);
              return;
            }
            
            soundRef.current = sound;
            const totalDuration = sound.getDuration();
            setPlaybackDuration(formatTime(totalDuration));
            
            // Démarrer la lecture
            sound.play((success) => {
              if (success) {
                console.log('Lecture terminée avec succès');
              } else {
                console.log('Erreur lors de la lecture');
              }
              setIsPlaying(false);
              setPlaybackPosition(0);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            });
            
            setIsPlaying(true);
            
            // Mettre à jour la position de lecture toutes les 100ms
            intervalRef.current = setInterval(() => {
              if (soundRef.current) {
                soundRef.current.getCurrentTime((seconds) => {
                  setPlaybackPosition(seconds);
                  if (seconds >= totalDuration) {
                    if (intervalRef.current) {
                      clearInterval(intervalRef.current);
                    }
                  }
                });
              }
            }, 100);
          });
        } else {
          // Jouer/Pauser le son existant
          if (isPlaying) {
            soundRef.current.pause();
            setIsPlaying(false);
          } else {
            soundRef.current.play((success) => {
              setIsPlaying(false);
              setPlaybackPosition(0);
            });
            setIsPlaying(true);
          }
        }
      };

      return (
        <HStack alignItems="center" space={2} width="100%">
        <TouchableOpacity onPress={handlePlayPause}>
          <Box
            bg={isUser ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
            p={2}
            borderRadius="full"
          >
            <FontAwesomeIcon 
              icon={isPlaying ? faPause : faPlay} 
              size={16} 
              color={isUser ? "white" : "#FF78B2"} 
            />
          </Box>
        </TouchableOpacity>
        
        <Box flex={1} height={2} bg={isUser ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} borderRadius={4}>
          <Box 
            height="100%" 
            width={`${(playbackPosition / (soundRef.current?.getDuration() || 1)) * 100}%`}
            bg={isUser ? "white" : "#FF78B2"}
            borderRadius={4}
          />
        </Box>
        
        <Text fontSize="xs" color={isUser ? "white" : "gray.600"}>
          {isPlaying ? formatTime(playbackPosition) : playbackDuration}
        </Text>
      </HStack>
      );
    };

    const messageComponent = (
      <Pressable onLongPress={handleLongPress}>
        {isReply && item.replyToMessage && (
          <ReplyPreview replyToMessage={item.replyToMessage} isUser={isUser} />
        )}

        {/* Ajout du cas pour les messages audio */}
        {hasAudio ? (
          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box p={3} style={getBubbleStyle(true, isReply)} minWidth={180} maxWidth={250}>
              <AudioPlayer uri={item.audio} duration={item.audioDuration} />
            </Box>
          </VStack>
        ) : hasImage && hasCleanText ? (
          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box style={getBubbleStyle(false, isReply)}>
              <MessageImage uri={item.image} onPress={openImageViewer} />
            </Box>

            <Box p={3} style={getBubbleStyle(true, isReply)}>
              <MessageText text={cleanText} isUser={isUser} />
            </Box>

            {/* Embeds affichés ici après le texte et l'image */}
            {hasEmbeds && renderEmbeds()}
          </VStack>
        ) : hasImage ? (
          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box style={getBubbleStyle(false, isReply)}>
              <MessageImage uri={item.image} onPress={openImageViewer} />
            </Box>

            {/* Embeds affichés ici après l'image */}
            {hasEmbeds && renderEmbeds()}
          </VStack>
        ) : hasCleanText ? (
          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box p={3} style={getBubbleStyle(true, isReply)}>
              <MessageText text={cleanText} isUser={isUser} />
            </Box>

            {/* Embeds affichés ici après le texte */}
            {hasEmbeds && renderEmbeds()}
          </VStack>
        ) : (
          // Si le message ne contient que des liens (pas de texte, pas d'image)
          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            {/* Afficher uniquement les embeds */}
            {hasEmbeds && renderEmbeds()}
          </VStack>
        )}
      </Pressable>
    );

    return messageComponent;
  };

  return (
    <Animated.View
      style={{
        backgroundColor: bgHighlight,
        borderRadius: 20,
        elevation: shadowElevation, // Pour Android
        shadowColor: "#8A2BE2",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: shadowOpacity,
        shadowRadius: shadowElevation,
        zIndex: showOptions ? 10 : 1 // Élever le z-index quand le menu est actif
      }}
    >
      <HStack
        width="100%"
        justifyContent="space-between"
        alignItems="flex-end"
        my={0.2}
        mb={isLastMessage ? 4 : 0}
        px={2}
        opacity={messageOpacity}
        position="relative"
      >
        {renderContextMenu()}

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
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Fonction de comparaison optimisée pour React.memo
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.image === nextProps.item.image &&
    prevProps.userData?._id === nextProps.userData?._id &&
    prevProps.item.isHighlighted === nextProps.item.isHighlighted &&
    !prevProps.item.isSending === !nextProps.item.isSending &&
    !prevProps.item.sendFailed === !nextProps.item.sendFailed
  );
});

export default MessageItem;