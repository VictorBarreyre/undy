// MessageItem.js
import React from 'react';
import { Animated } from 'react-native';
import { Box, Text, HStack, Image, VStack } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { styles } from '../../infrastructure/theme/styles'; // Adaptez le chemin selon votre structure

const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp);
  
  return messageDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MessageItem = ({ 
  item, 
  index, 
  messages, 
  userData, 
  showTimestamps, 
  timestampAnimation 
}) => {
  // Si c'est un séparateur, retourner directement l'en-tête de date
  if (item.type === 'separator') {
    return (
      <Text textAlign="center" color="#94A3B8" my={2}>
        {formatMessageTime(item.timestamp)}
      </Text>
    );
    
  }



  // Vérifier si ce message fait partie d'une séquence
  const isPreviousSameSender = index > 0 &&
    messages[index - 1].sender === item.sender &&
    messages[index - 1].type !== 'separator';

  const isNextSameSender = index < messages.length - 1 &&
    messages[index + 1].sender === item.sender &&
    messages[index + 1].type !== 'separator';

  // Déterminer la position dans la séquence
  let position = 'single'; // Message isolé
  if (isPreviousSameSender && isNextSameSender) {
    position = 'middle'; // Au milieu d'une séquence
  } else if (isPreviousSameSender) {
    position = 'last';   // Dernier d'une séquence
  } else if (isNextSameSender) {
    position = 'first';  // Premier d'une séquence
  }

  // Définir si on doit afficher l'avatar
  const showAvatar = position === 'single' || position === 'last';

  // Ajuster le style de la bulle en fonction de la position et du sender
  const getBubbleStyle = (isTextMessage = true) => {
    // Style de base pour les bulles de texte
    const baseTextStyle = {
      borderRadius: 10,
      overflow: 'hidden',
      marginVertical: 1,
    };

    // Style de base pour les images
    const baseImageStyle = {
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    };

    const baseStyle = isTextMessage ? baseTextStyle : baseImageStyle;

    if (item.sender === 'user') {

      // Messages de l'utilisateur (à droite)
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
      // Messages des autres (à gauche)
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

  // Vérifier si le message a du texte significatif (pas juste des espaces)
  const hasRealText = item.text && item.text.trim().length > 0 && item.text.toLowerCase() !== 'mixed';

  // Vérifier si le message a une image
  const hasImage = item.messageType === 'image' || item.image;

  // Animations pour les timestamps
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

  // Marges en fonction du type d'expéditeur
  const messageMargin = 0.3;

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
        {/* Photo de profil pour les messages reçus */}
        {item.sender !== 'user' && (
          <>
            {showAvatar ? (
              <Image
                source={
                  item.senderInfo?.profilePicture
                    ? { uri: item.senderInfo.profilePicture }
                    : require('../../assets/images/default.png')
                }
                alt="Profile"
                size={8}
                rounded="full"
              />
            ) : (
              <Box size={8} opacity={0} /> // Espace vide invisible pour garder l'alignement
            )}
          </>
        )}

        <VStack
          maxWidth="80%"
          alignItems={item.sender === 'user' ? 'flex-end' : 'flex-start'}
        >
          {/* Nom de l'expéditeur uniquement pour le premier message d'une séquence */}
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

          {/* Gestion des différents types de messages */}
          {hasImage && hasRealText ? (
            // Message mixte (image + texte)
            <VStack space={1} alignItems={item.sender === 'user' ? 'flex-end' : 'flex-start'}>
              {/* L'image en premier */}
              <Box style={{
                ...getBubbleStyle(false),
                marginVertical: 10, // Marge verticale uniforme pour les images
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

              {/* Ensuite le texte */}
              <Box
                p={3}
                style={getBubbleStyle(true)}
              >
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
                <Text
                  color={item.sender === 'user' ? 'white' : 'black'}
                  style={styles.caption}
                >
                  {item.text}
                </Text>
              </Box>
            </VStack>
          ) : hasImage ? (
            // Message avec image uniquement - pas de bulle de texte
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
          ) : (
            // Message avec texte uniquement
            <Box
              p={3}
              style={getBubbleStyle(true)}
            >
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

              <Text
                color={item.sender === 'user' ? 'white' : 'black'}
                style={styles.caption}
              >
                {item.text}
              </Text>
            </Box>
          )}
        </VStack>

        {/* Photo de profil pour les messages envoyés */}
        {item.sender === 'user' && (
          <>
            {showAvatar ? (
              <Image
                source={
                  userData?.profilePicture
                    ? { uri: userData.profilePicture }
                    : require('../../assets/images/default.png')
                }
                alt="Profile"
                size={8}
                rounded="full"
              />
            ) : (
              <Box size={8} opacity={0} /> // Espace vide invisible pour garder l'alignement
            )}
          </>
        )}
      </HStack>

      {/* Horodatage des messages - uniquement pour le dernier message d'une séquence */}
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
            {formatMessageTime(item.timestamp)}
          </Animated.Text>
        </Animated.View>
      )}
    </HStack>
  );
};

export default MessageItem;