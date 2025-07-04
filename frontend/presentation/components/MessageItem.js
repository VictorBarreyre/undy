import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Animated, Easing, TouchableOpacity, Pressable, Linking, View, ActivityIndicator } from 'react-native';
import { Box, Text, HStack, VStack } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faReply, faCopy, faPlay, faPause, faTimes, faVideoCamera } from '@fortawesome/free-solid-svg-icons';
import { styles, bubbleStyles } from '../../infrastructure/theme/styles';
import ImageView from 'react-native-image-viewing';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters';
import LinkPreview from './chatcomponents/LinkPreview';
import DateSeparator from './chatcomponents/DateSeparator';
import ReplyPreview from './chatcomponents/ReplyPreview';
import MessageImage from './chatcomponents/MessageImage';
import MessageText from './chatcomponents/MessageText';
import Avatar from './chatcomponents/Avatar';
import Video from 'react-native-video';

// Composant VideoPlayer intégré
const VideoPlayer = memo(({ uri, thumbnailUri, duration, isUser }) => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({
    width: 200,
    height: 150
  });

  // Fonction pour formater la durée
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePress = () => {
    if (videoRef.current && !error && !isLoading) {
      videoRef.current.presentFullscreenPlayer();
    }
  };

  const handleLoad = (data) => {
    setIsLoading(false);

    if (data.naturalSize) {
      const { width, height } = data.naturalSize;
      const aspectRatio = width / height;

      let finalWidth = 200;
      let finalHeight = 200 / aspectRatio;

      if (finalHeight > 250) {
        finalHeight = 250;
        finalWidth = 250 * aspectRatio;
      }

      setVideoDimensions({
        width: finalWidth,
        height: finalHeight
      });
    }
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  // Styles définis localement
  const overlayStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const playButtonStyles = {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const durationStyles = {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  };

  const errorStyles = {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10
  };

  if (error) {
    return (
      <Box style={[videoDimensions, errorStyles]}>
        <FontAwesomeIcon icon={faVideoCamera} size={30} color="#999" />
        <Text style={{ color: '#999', marginTop: 8, fontSize: 12 }}>
          Vidéo non disponible
        </Text>
      </Box>);

  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={{ position: 'relative' }}>

      <Box style={[videoDimensions, { borderRadius: 10, overflow: 'hidden' }]}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0
          }}
          paused={true}
          resizeMode="cover"
          onLoad={handleLoad}
          onError={handleError}
          poster={thumbnailUri}
          posterResizeMode="cover"
          controls={false}

          // Callbacks fullscreen
          onFullscreenPlayerWillPresent={() => {

          }}
          onFullscreenPlayerDidPresent={() => {

            // Vidéo démarre automatiquement en fullscreen
          }} onFullscreenPlayerWillDismiss={() => {

          }}
          onFullscreenPlayerDidDismiss={() => {

            // Retour à l'état initial
          }} />
        
        {/* Overlay de contrôle */}
        {!isLoading &&
        <View style={overlayStyles}>
            <View style={playButtonStyles}>
              <FontAwesomeIcon icon={faPlay} size={20} color="#FFF" />
            </View>
          </View>
        }
        
        {/* Indicateur de chargement */}
        {isLoading &&
        <View style={overlayStyles}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        }
        
        {/* Durée */}
        {duration && !isLoading &&
        <View style={durationStyles}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
              {formatDuration(duration)}
            </Text>
          </View>
        }
      </Box>
    </TouchableOpacity>);

});

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

  if (!item) return null;

  if (item.type === 'separator') {
    return <DateSeparator timestamp={item.timestamp} />;
  }

  const isLastMessage = index === messages.length - 1;

  const timestampAnimation = useRef(new Animated.Value(showTimestamps ? 1 : 0)).current;
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const shadowAnimation = useRef(new Animated.Value(0)).current;

  const isSending = !!item.isSending;
  const sendFailed = !!item.sendFailed;
  const messageOpacity = isSending ? 0.7 : 1;

  const isReply = !!item.replyToMessage;

  useEffect(() => {
    if (item.isHighlighted) {
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
      })]
      ).start();
    }
  }, [item.isHighlighted]);

  useEffect(() => {
    if (showOptions) {
      Animated.timing(shadowAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      }).start();
    } else {
      Animated.timing(shadowAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false
      }).start();
    }
  }, [showOptions]);

  const bgHighlight = highlightAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', item.sender === 'user' ? 'rgba(255,88,126,0.15)' : 'rgba(0,0,0,0.05)']
  });

  useEffect(() => {
    Animated.timing(timestampAnimation, {
      toValue: showTimestamps ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true
    }).start();
  }, [showTimestamps]);

  const handleLongPress = useCallback(() => {
    if (!isSending && !sendFailed) {
      const isNearEnd = index >= messages.length - 3;
      const menuPlacement = isNearEnd ? 'top' : 'bottom';

      setMenuPosition(menuPlacement);
      setShowOptions(true);

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
    })]
    ).start(() => {
      setShowOptions(false);
    });
  };

  const handleReply = useCallback(() => {
    if (onReplyToMessage) {
      onReplyToMessage(item);
    }
    closeMenu();
  }, [item, onReplyToMessage]);

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
                video: item.video,
                messageType: item.messageType,
                replyToMessage: item.replyToMessage
              });
            }}>

            <Text
              style={[
              styles.littleCaption,
              {
                color: 'red',
                textDecorationLine: 'underline'
              }]
              }>

              {t('chat.retry')}
            </Text>
          </TouchableOpacity>
        </HStack>);

    }

    if (isSending) {
      return (
        <Text style={[styles.littleCaption, { color: '#94A3B8' }]} mr={2}>
          {t('chat.sending')}
        </Text>);

    }

    return null;
  };

  const openImageViewer = useCallback(() => {
    setIsImageViewVisible(true);
  }, []);

  const closeImageViewer = useCallback(() => {
    setIsImageViewVisible(false);
  }, []);

  const position = getMessagePosition(index, messages);
  const showAvatar = position === 'single' || position === 'last';

  const hasRealText = item.text && typeof item.text === 'string' && item.text.trim().length > 0 && item.text.trim() !== " ";
  const hasImage = item.image && typeof item.image === 'string' && item.image.length > 0;
  const hasVideo = item.messageType === 'video' && item.video || item.video && typeof item.video === 'string' && item.video.length > 0;

  const isUser = item.sender === 'user';
  const getBubbleStyle = useCallback((isTextMessage = true, isReplyBubble = false) => {
    const senderType = isUser ? 'user' : 'other';

    if (isReplyBubble) {
      return bubbleStyles.reply[senderType][position];
    }

    return isTextMessage ? bubbleStyles[senderType][position] : bubbleStyles.image[senderType][position];
  }, [isUser, position]);

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

  const shadowElevation = shadowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5]
  });

  const shadowOpacity = shadowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.2]
  });

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

  const renderContextMenu = () => {
    if (!showOptions) return null;

    const translateY = menuAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: menuPosition === 'bottom' ? [10, 0] : [-10, 0]
    });

    return (
      <Animated.View
        style={{
          position: "absolute",
          top: -70,
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
        }}>

        <Box
          style={{
            position: 'absolute',
            bottom: -8,
            left: isUser ? '95%' : '5%',
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
            transform: [{ rotate: '180deg' }]
          }} />

        <TouchableOpacity
          onPress={handleReply}
          style={{
            padding: 8,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12
          }}>

          <FontAwesomeIcon icon={faReply} size={14} color="#94A3B8" />
          <Text style={styles.littleCaption} color="#94A3B8" fontSize="xs" ml={2} fontWeight="medium">
            Répondre
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            closeMenu();
          }}
          style={{
            padding: 8,
            marginLeft: 8,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12
          }}>

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
          }}>

          <FontAwesomeIcon icon={faTimes} size={14} color="#94A3B8" />
          <Text style={styles.littleCaption} color="#94A3B8" fontSize="xs" ml={2}>
            Annuler
          </Text>
        </TouchableOpacity>
      </Animated.View>);

  };

  const messageContent = () => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const embedUrls = (item.text || '').match(urlRegex) || [];
    const hasEmbeds = embedUrls.length > 0;

    let cleanText = item.text || '';
    if (hasEmbeds) {
      const textWithoutUrls = embedUrls.reduce((text, url) => text.replace(url, ''), cleanText).trim();
      cleanText = textWithoutUrls.length > 0 ? textWithoutUrls : '';
    }

    const hasCleanText = cleanText.length > 0;
    const hasAudio = item.messageType === 'audio' && item.audio;

    const renderEmbeds = () => {
      return embedUrls.map((url, index) => {
        return (
          <Box
            key={`${url}-${index}`}
            mt={hasCleanText ? 2 : 0}
            width="full"
            alignSelf={isUser ? 'flex-end' : 'flex-start'}>

            <LinkPreview url={url} onPress={() => Linking.openURL(url)} isUser={isUser} />
          </Box>);

      });
    };

    // Composant pour afficher le lecteur audio
    const AudioPlayer = ({ uri, duration = "00:00" }) => {
      const [isPlaying, setIsPlaying] = useState(false);
      const [playbackPosition, setPlaybackPosition] = useState(0);
      const [playbackDuration, setPlaybackDuration] = useState(duration);
      const soundRef = useRef(null);
      const intervalRef = useRef(null);

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
              }
            } catch (error) {
              console.error('Erreur lors de la vérification de l\'URL audio:', error);
            }
          }
        };

        checkAudioURL();
      }, [uri]);

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
          const Sound = require('react-native-sound');
          Sound.setCategory('Playback');



          const sound = new Sound(uri, null, (error) => {
            if (error) {

              return;
            }

            soundRef.current = sound;
            const totalDuration = sound.getDuration();
            setPlaybackDuration(formatTime(totalDuration));

            sound.play((success) => {
              if (success) {

              } else {

              }
              setIsPlaying(false);
              setPlaybackPosition(0);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            });

            setIsPlaying(true);

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
              borderRadius="full">

              <FontAwesomeIcon
                icon={isPlaying ? faPause : faPlay}
                size={16}
                color={isUser ? "white" : "#FF78B2"} />

            </Box>
          </TouchableOpacity>

          <Box flex={1} height={2} bg={isUser ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} borderRadius={4}>
            <Box
              height="100%"
              width={`${playbackPosition / (soundRef.current?.getDuration() || 1) * 100}%`}
              bg={isUser ? "white" : "#FF78B2"}
              borderRadius={4} />

          </Box>

          <Text fontSize="xs" color={isUser ? "white" : "gray.600"}>
            {isPlaying ? formatTime(playbackPosition) : playbackDuration}
          </Text>
        </HStack>);

    };

    const messageComponent =
    <Pressable onLongPress={handleLongPress}>
        {isReply && item.replyToMessage &&
      <ReplyPreview replyToMessage={item.replyToMessage} isUser={isUser} />
      }

        {hasVideo ?
      <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box style={getBubbleStyle(false, isReply)}>
              <VideoPlayer
            uri={item.video || item.videoUrl}
            thumbnailUri={item.thumbnailUrl}
            duration={item.duration || item.videoDuration}
            isUser={isUser} />

            </Box>
            
            {hasCleanText &&
        <Box p={3} style={getBubbleStyle(true, isReply)} mt={1}>
                <MessageText text={cleanText} isUser={isUser} />
              </Box>
        }
            
            {hasEmbeds && renderEmbeds()}
          </VStack> :
      hasAudio ?
      <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box
          p={3}
          style={getBubbleStyle(true, isReply)}
          minWidth={180}
          maxWidth={250}
          position="relative"
          overflow="hidden">

              {isUser ?
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            }} /> :


          <Box
            bg='#FFFFFF'
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            }} />

          }

              <AudioPlayer uri={item.audio} duration={item.audioDuration} isUser={isUser} />
            </Box>
          </VStack> :
      hasImage && hasCleanText ?
      <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box style={getBubbleStyle(false, isReply)}>
              <MessageImage uri={item.image} onPress={openImageViewer} />
            </Box>

            <Box p={3} style={getBubbleStyle(true, isReply)}>
              <MessageText text={cleanText} isUser={isUser} />
            </Box>

            {hasEmbeds && renderEmbeds()}
          </VStack> :
      hasImage ?
      <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box style={getBubbleStyle(false, isReply)}>
              <MessageImage uri={item.image} onPress={openImageViewer} />
            </Box>

            {hasEmbeds && renderEmbeds()}
          </VStack> :
      hasCleanText ?
      <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            <Box p={3} style={getBubbleStyle(true, isReply)}>
              <MessageText text={cleanText} isUser={isUser} />
            </Box>

            {hasEmbeds && renderEmbeds()}
          </VStack> :

      <VStack alignItems={isUser ? 'flex-end' : 'flex-start'}>
            {hasEmbeds && renderEmbeds()}
          </VStack>
      }
      </Pressable>;


    return messageComponent;
  };

  return (
    <Animated.View
      style={{
        backgroundColor: bgHighlight,
        borderRadius: 20,
        elevation: shadowElevation,
        shadowColor: "#8A2BE2",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: shadowOpacity,
        shadowRadius: shadowElevation,
        zIndex: showOptions ? 10 : 1
      }}>

      <HStack
        width="100%"
        justifyContent="space-between"
        alignItems="flex-end"
        my={0.2}
        mb={isLastMessage ? 4 : 0}
        px={2}
        opacity={messageOpacity}
        position="relative">

        {renderContextMenu()}

        <HStack
          flex={1}
          justifyContent={isUser ? 'flex-end' : 'flex-start'}
          alignItems="flex-end"
          space={1}>

          {!isUser && avatarContent()}

          <VStack
            maxWidth="80%"
            alignItems={isUser ? 'flex-end' : 'flex-start'}>

            {!isUser && (position === 'first' || position === 'single') &&
            <HStack alignItems="center">
                <Text
                style={styles.littleCaption}
                color="#94A3B8"
                ml={2}
                mb={1}>

                  {item.senderInfo?.name || t('chat.defaultUser')}
                </Text>
                {renderMessageStatus()}
              </HStack>
            }

            {isUser &&
            <HStack alignItems="center">
                {renderMessageStatus()}
              </HStack>
            }

            {messageContent()}
          </VStack>

          {isUser && avatarContent()}
        </HStack>

        {hasImage &&
        <ImageView
          images={[{ uri: item.image }]}
          imageIndex={0}
          visible={isImageViewVisible}
          onRequestClose={closeImageViewer}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true} />

        }

        {showTimestamps &&
        <Animated.View
          style={{
            opacity: timestampOpacity,
            alignItems: 'flex-end'
          }}>

            <Animated.Text
            style={[
            styles.littleCaption,
            {
              color: '#94A3B8',
              fontSize: 10,
              marginBottom: 6,
              marginRight: 10,
              transform: [{ translateX: timestampWidth }]
            }]
            }>

              {dateFormatter.formatTimeOnly(item.timestamp)}
            </Animated.Text>
          </Animated.View>
        }
      </HStack>
    </Animated.View>);

}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.image === nextProps.item.image &&
    prevProps.item.video === nextProps.item.video &&
    prevProps.userData?._id === nextProps.userData?._id &&
    prevProps.item.isHighlighted === nextProps.item.isHighlighted &&
    !prevProps.item.isSending === !nextProps.item.isSending &&
    !prevProps.item.sendFailed === !nextProps.item.sendFailed);

});

export default MessageItem;