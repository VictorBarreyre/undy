import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Box, Text, HStack, Image, VStack } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { styles } from '../../infrastructure/theme/styles';

// Fonction formatage de temps importée du ChatScreen
const formatMessageTime = (timestamp, showFullDate = false, showTimeOnly = false) => {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (showTimeOnly) {
    return messageDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (showFullDate) {
    if (messageDate.toDateString() === today.toDateString()) {
      return `Aujourd'hui, ${messageDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Hier, ${messageDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } else {
      return messageDate.toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  if (messageDate.toDateString() === today.toDateString()) {
    return 'Aujourd\'hui';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  } else {
    return messageDate.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }
};

const DateSeparator = ({ timestamp }) => {
  return (
    <Text textAlign="center" color="#94A3B8" my={2}>
      {formatMessageTime(timestamp, true)}
    </Text>
  );
};

const MessageItem = ({ 
  item, 
  index, 
  messages, 
  userData, 
  showTimestamps 
}) => {
  const timestampAnimation = useRef(new Animated.Value(showTimestamps ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(timestampAnimation, {
      toValue: showTimestamps ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true
    }).start();
  }, [showTimestamps]);

  // Si c'est un séparateur de date, on affiche uniquement la date
  if (item.type === 'separator') {
    return <DateSeparator timestamp={item.timestamp} />;
  }

  // Déterminer la position du message dans une séquence de messages du même expéditeur
  const isPreviousSameSender = index > 0 &&
    messages[index - 1].sender === item.sender &&
    messages[index - 1].type !== 'separator';

  const isNextSameSender = index < messages.length - 1 &&
    messages[index + 1].sender === item.sender &&
    messages[index + 1].type !== 'separator';

  let position = 'single';
  if (isPreviousSameSender && isNextSameSender) {
    position = 'middle';
  } else if (isPreviousSameSender) {
    position = 'last';
  } else if (isNextSameSender) {
    position = 'first';
  }

  const showAvatar = position === 'single' || position === 'last';

  // Styles de bulle en fonction de la position dans la séquence
  const getBubbleStyle = (isTextMessage = true) => {
    const baseTextStyle = {
      borderRadius: 20,
      overflow: 'hidden',
      marginVertical: 1,
    };

    const baseImageStyle = {
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    };

    const baseStyle = isTextMessage ? baseTextStyle : baseImageStyle;

    if (item.sender === 'user') {
      switch (position) {
        case 'first':
          return {
            ...baseStyle,
            borderBottomRightRadius: isTextMessage ? 3 : 10,
            marginBottom: 1,
          };
        case 'middle':
          return {
            ...baseStyle,
            borderTopRightRadius: isTextMessage ? 3 : 10,
            borderBottomRightRadius: isTextMessage ? 3 : 10,
            marginVertical: 1,
          };
        case 'last':
          return {
            ...baseStyle,
            borderTopRightRadius: isTextMessage ? 3 : 10,
            marginTop: 1,
          };
        default:
          return baseStyle;
      }
    } else {
      switch (position) {
        case 'first':
          return {
            ...baseStyle,
            borderBottomLeftRadius: isTextMessage ? 3 : 10,
            marginBottom: 1,
          };
        case 'middle':
          return {
            ...baseStyle,
            borderTopLeftRadius: isTextMessage ? 3 : 10,
            borderBottomLeftRadius: isTextMessage ? 3 : 10,
            marginVertical: 1,
          };
        case 'last':
          return {
            ...baseStyle,
            borderTopLeftRadius: isTextMessage ? 3 : 10,
            marginTop: 1,
          };
        default:
          return baseStyle;
      }
    }
  };

  // Vérifier si le message a du texte et/ou une image
  const hasRealText = item.text && item.text.trim().length > 0 && item.text.toLowerCase() !== 'mixed';
  const hasImage = item.messageType === 'image' || item.image;

  // Animation pour les horodatages
  const timestampWidth = timestampAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
    extrapolate: 'clamp'
  });

  const timestampOpacity = timestampAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const messageMargin = 0.3;

  // Rendu du contenu du message
  const renderMessageContent = () => {
    if (hasImage && hasRealText) {
      return (
        <VStack space={1} alignItems={item.sender === 'user' ? 'flex-end' : 'flex-start'}>
          <Box style={{
            ...getBubbleStyle(false),
            marginVertical: 10,
          }}>
            <Image
              alt="Message image"
              source={{ uri: item.image }}
              style={{
                width: 150,
                height: 150,
                borderRadius: 10
              }}
              resizeMode="cover"
            />
          </Box>

          <Box p={3} style={getBubbleStyle(true)}>
            {item.sender === 'user' ? (
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
            <Text color={item.sender === 'user' ? 'white' : 'black'} style={styles.caption}>
              {item.text}
            </Text>
          </Box>
        </VStack>
      );
    } else if (hasImage) {
      return (
        <Box style={getBubbleStyle(false)}>
          <Image
            alt="Message image"
            source={{ uri: item.image }}
            style={{
              width: 150,
              height: 150,
              borderRadius: 10
            }}
            resizeMode="cover"
          />
        </Box>
      );
    } else {
      return (
        <Box p={3} style={getBubbleStyle(true)}>
          {item.sender === 'user' ? (
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

          <Text color={item.sender === 'user' ? 'white' : 'black'} style={styles.caption}>
            {item.text}
          </Text>
        </Box>
      );
    }
  };

  // Rendu de l'avatar
  const renderAvatar = () => {
    if (!showAvatar) {
      return <Box size={8} opacity={0} />;
    }

    const imageSource = item.sender === 'user'
      ? (userData?.profilePicture ? { uri: userData.profilePicture } : require('../../assets/images/default.png'))
      : (item.senderInfo?.profilePicture ? { uri: item.senderInfo.profilePicture } : require('../../assets/images/default.png'));

    return (
      <Image
        source={imageSource}
        alt="Profile"
        size={8}
        rounded="full"
      />
    );
  };

  return (
    <HStack
      width="100%"
      justifyContent="space-between"
      alignItems="flex-end"
      my={messageMargin}
      px={2}
    >
      <HStack
        flex={1}
        justifyContent={item.sender === 'user' ? 'flex-end' : 'flex-start'}
        alignItems="flex-end"
        space={1}
      >
        {item.sender !== 'user' && renderAvatar()}

        <VStack
          maxWidth="80%"
          alignItems={item.sender === 'user' ? 'flex-end' : 'flex-start'}
        >
          {item.sender !== 'user' && (position === 'first' || position === 'single') && (
            <Text
              style={styles.littleCaption}
              color="#94A3B8"
              ml={2}
              mb={1}
            >
              {item.senderInfo?.name || 'Utilisateur'}
            </Text>
          )}

          {renderMessageContent()}
        </VStack>

        {item.sender === 'user' && renderAvatar()}
      </HStack>

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
};

export default MessageItem;