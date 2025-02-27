import React, { useState, useEffect, useContext, useRef } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated, PanResponder, Easing } from 'react-native';
import { Box, Input, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faChevronLeft, faPlus, faTimes, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { Background } from '../../navigation/Background';
import { TouchableOpacity } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { launchImageLibrary } from 'react-native-image-picker';
import * as RN from 'react-native'; // Import alternatif pour accéder à Keyboard



const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp);
  const now = new Date();

  // Différence en heures
  const hoursDiff = (now - messageDate) / (1000 * 60 * 60);

  // Si moins de 24h
  if (hoursDiff < 24) {
    // Aujourd'hui
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // Hier
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
  }

  // Si moins de 6 heures
  if (hoursDiff < 6) {
    return 'Il y a quelques heures';
  }

  // Si moins de 12 heures
  if (hoursDiff < 12) {
    return 'Ce matin';
  }

  // Si moins de 24 heures
  if (hoursDiff < 24) {
    return "Aujourd'hui";
  }

  // Au-delà de 24h, afficher la date complète
  return messageDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ChatScreen = ({ route }) => {
  const { conversationId, secretData, conversation, showModalOnMount } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, getConversationMessages, markConversationAsRead, uploadImage } = useCardData();
  const { userData } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isModalVisible, setModalVisible] = useState(showModalOnMount || false);
  const isInitialMount = useRef(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inputContainerHeight, setInputContainerHeight] = useState(60);
  const [inputHeight, setInputHeight] = useState(36); // hauteur par défaut
  const [borderRadius, setBorderRadius] = useState(18); // rayon par défaut
  const flatListRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(Platform.OS === 'ios' ? 60 : 0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);



  useEffect(() => {
    // Utiliser RN.Keyboard au lieu de Keyboard
    const keyboardDidShowListener = Platform.OS === 'ios' 
      ? RN.Keyboard.addListener('keyboardWillShow', (e) => {
          const offset = e.endCoordinates.height;
          setKeyboardOffset(offset);
        })
      : null;

    const keyboardDidHideListener = Platform.OS === 'ios'
      ? RN.Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardOffset(95);
        })
      : null;

    return () => {
      if (keyboardDidShowListener) {
        keyboardDidShowListener.remove();
      }
      if (keyboardDidHideListener) {
        keyboardDidHideListener.remove();
      }
    };
  }, []);

  const updateInputAreaHeight = (imageVisible) => {
    // Hauteur de base + hauteur image si présente
    const newHeight = imageVisible ? 280 : 60; // 60 pour l'input, ~220 pour l'image
    setInputContainerHeight(newHeight);
  };

  // Pour les nouveaux messages, garder 'user' tel quel
  const sendMessage = async () => {
    try {
      if (!conversationId) {
        throw new Error('ID de conversation manquant');
      }
  
      // Vérifier s'il y a du contenu à envoyer (texte ou image)
      if (!message.trim() && !selectedImage) return;
  
      if (!userData?.name) {
        throw new Error('Informations utilisateur manquantes');
      }
  
      // Déterminer le type de message en fonction du contenu
      let messageType = 'text';
      if (selectedImage && message.trim()) {
        messageType = 'mixed';  // Texte + image
      } else if (selectedImage) {
        messageType = 'image';  // Image uniquement
      }
  
      // Créer l'objet de base pour le message
      let messageContent = {
        content: message.trim() || " ",  // Utiliser un espace si pas de texte
        senderName: userData.name,
        messageType: messageType
      };
  
      // Si une image est sélectionnée, l'uploader et ajouter son URL
      if (selectedImage) {
        try {
          // Préparer l'image pour l'upload
          let imageData;
          if (selectedImage.base64) {
            imageData = `data:${selectedImage.type};base64,${selectedImage.base64}`;
          } else if (selectedImage.uri) {
            imageData = selectedImage.uri;
          }
  
          // Utiliser la fonction de votre contexte pour l'upload
          const uploadResult = await uploadImage(imageData);
  
          // Ajouter l'URL de l'image au message
          messageContent.image = uploadResult.url;
        } catch (uploadError) {
          console.error('Erreur lors de l\'upload de l\'image:', uploadError);
          throw new Error('Échec de l\'upload de l\'image');
        }
      }
  
      // Envoyer le message et récupérer la réponse
      const newMessage = await handleAddMessage(conversationId, messageContent);
  
      // Mise à jour de l'UI avec le nouveau message
      setMessages(prev => [...prev, {
        id: newMessage._id || `local-${Date.now()}`,
        text: message,
        messageType: messageContent.messageType,
        image: messageContent.image,
        sender: 'user',
        timestamp: new Date().toISOString(),
        senderInfo: {
          id: userData._id,
          name: userData.name
        }
      }]);
  
      // Réinitialiser les champs
      setMessage('');
      setSelectedImage(null);
      updateInputAreaHeight(false);
  
      // Défiler vers le bas pour voir le nouveau message
      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      });
  
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    }
  };


  const handleImagePick = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        // Mettre à jour la hauteur immédiatement
        updateInputAreaHeight(true);

        // Utiliser requestAnimationFrame au lieu de setTimeout
        requestAnimationFrame(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection:', error);
    }
  };

  const calculateBorderRadius = (height) => {
    // Une ligne: hauteur d'environ 36-40px
    // Plus la hauteur augmente, plus on réduit le border radius
    if (height <= 40) {
      return 18; // Complètement rond pour une ligne
    } else if (height <= 60) {
      return 15; // Légèrement moins arrondi pour deux lignes
    } else {
      return 10; // Encore moins arrondi pour trois lignes ou plus
    }
  };

  // 1. Marquer la conversation comme lue
  useEffect(() => {
    const markAsRead = async () => {
      if (conversationId) {
        try {
          await markConversationAsRead(conversationId);
        } catch (error) {
          console.error('Erreur lors du marquage comme lu', error);
        }
      }
    };

    markAsRead();

    // Gestion de la modale au montage
    if (isInitialMount.current && showModalOnMount) {
      setModalVisible(true);
      isInitialMount.current = false;
    }
  }, [conversationId, markConversationAsRead, showModalOnMount]);

  // 2. Formatage des messages et défilement
  useEffect(() => {
    if (conversation?.messages) {
      // Créer un mapping des IDs vers les infos utilisateurs
      const userMapping = {};
      if (conversation.participants) {
        conversation.participants.forEach(participant => {
          userMapping[participant._id] = {
            name: participant.name,
            profilePicture: participant.profilePicture
          };
        });
      }

      const formattedMessages = [];
      let lastMessageDate = null;

      conversation.messages.forEach((msg, index) => {
        const currentMessageDate = new Date(msg.createdAt);
        const isCurrentUser = msg.sender === userData?._id;

        // Séparateur de date si nécessaire
        if (!lastMessageDate ||
          currentMessageDate.toDateString() !== lastMessageDate.toDateString()) {
          formattedMessages.push({
            id: `separator-${index}`,
            type: 'separator',
            timestamp: msg.createdAt
          });
        }

        // Vérifier si c'est un message image
        const isImageMessage = msg.messageType === 'image' || msg.image;

        // Message avec le nom de l'expéditeur depuis le mapping
        formattedMessages.push({
          id: msg._id,
          text: msg.content,
          sender: isCurrentUser ? 'user' : 'other',
          timestamp: msg.createdAt,
          messageType: isImageMessage ? 'image' : 'text',
          image: msg.image, // S'assurer que l'URL de l'image est incluse
          senderInfo: {
            id: msg.sender,
            name: userMapping[msg.sender]?.name || 'Utilisateur',
            profilePicture: userMapping[msg.sender]?.profilePicture || null
          }
        });

        lastMessageDate = currentMessageDate;
      });

      setMessages(formattedMessages);

      // Défilement automatique quand les messages sont chargés
      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      });
    }
  }, [conversation, userData?._id]);

  // 3. Gestion du temps restant avant expiration
  useEffect(() => {
    const calculateTimeLeft = () => {
      const expirationDate = new Date(conversation.expiresAt);
      const now = new Date();
      const difference = expirationDate - now;

      if (difference <= 0) {
        return 'Expiré';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      return `${days}j ${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Mise à jour chaque minute

    return () => clearInterval(timer);
  }, [conversation.expiresAt]);

  // 4. Gestion de l'image sélectionnée
  useEffect(() => {
    // Mettre à jour la hauteur du conteneur
    updateInputAreaHeight(!!selectedImage);

    // Défilement automatique quand une image est ajoutée
    if (selectedImage && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      });
    }
  }, [selectedImage]);



  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Respond to horizontal swipes with more than 10 pixel movement
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: new Animated.Value(0) }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped left significantly, show timestamps
        if (gestureState.dx < -100) {
          setShowTimestamps(true);
        }
        // If swiped right significantly, hide timestamps
        else if (gestureState.dx > 100) {
          setShowTimestamps(false);
        }

        // Animate back to original position
        Animated.spring(new Animated.Value(gestureState.dx), {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: false
        }).start();
      }
    })
  ).current;

  const timestampAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(timestampAnimation, {
      toValue: showTimestamps ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true
    }).start();
  }, [showTimestamps]);

  const renderMessage = ({ item }) => {
    if (item.type === 'separator') {
      return (
        <Text textAlign="center" color="#94A3B8" my={2}>
          {formatMessageTime(item.timestamp)}
        </Text>
      );
    }
  
    const messageMargin = item.sender === 'user' ? 0.3 : 1; // Marge plus petite pour les messages de l'utilisateur

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
  
    // Vérifier si le message a du texte significatif (pas juste des espaces)
    const hasRealText = item.text && item.text.trim().length > 0;
    
    // Vérifier si le message a une image
    const hasImage = item.messageType === 'image' || item.image;
  
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
          )}
  
          <VStack
            maxWidth="80%"
            alignItems={item.sender === 'user' ? 'flex-end' : 'flex-start'}
          >
            {/* Nom de l'expéditeur pour les messages reçus */}
            {item.sender !== 'user' && (
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
              <VStack space={0} alignItems={item.sender === 'user' ? 'flex-end' : 'flex-start'}>
                {/* L'image en premier */}
                <Box
                  style={{
                    backgroundColor: 'transparent',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
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
                  borderRadius={20}
                  style={{
                    overflow: 'hidden'
                  }}
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
              <Box
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
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
                borderRadius={20}
                style={{
                  marginVertical: 4,
                  overflow: 'hidden'
                }}
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
          )}
        </HStack>
  
        {/* Horodatage des messages */}
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


  return (
    <Background>
    <SafeAreaView style={{ flex: 1 }} {...panResponder.panHandlers}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          {/* En-tête avec informations de conversation */}
          <HStack
            alignItems="center"
            space={3}
            p={4}
          >
            <TouchableOpacity onPress={() => navigation.navigate('Conversations')}>
              <FontAwesomeIcon icon={faChevronLeft} size={20} color="#000" />
            </TouchableOpacity>

            <HStack flex={1} alignItems="center" space={5}>
              <Image
                source={
                  secretData?.user?.profilePicture
                    ? { uri: secretData.user.profilePicture }
                    : require('../../assets/images/default.png')
                }
                alt="Profile"
                size={12}
                rounded="full"
              />
              <VStack space={1} flex={1}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text style={styles.h5}>
                    {secretData?.user?.name || 'Utilisateur'}
                  </Text>
                  <Text style={styles.littleCaption} color="#94A3B8">
                    {conversation?.participants?.length || 0} participants
                  </Text>
                </HStack>

                <HStack justifyContent='space-between'>
                  <Pressable onPress={() => setModalVisible(true)}>
                    <Text style={styles.littleCaption} color="#FF78B2">
                      {secretData?.content?.substring(0, 15)}...
                    </Text>
                  </Pressable>
                  <Text style={styles.littleCaption} color="#94A3B8">
                    Expire dans {timeLeft}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
          </HStack>

          {/* Liste des messages */}
          <Box flex={1} pb={5}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: 20,
                paddingHorizontal: 10
              }}
              onContentSizeChange={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
              onLayout={(event) => {
                if (flatListRef.current && messages.length > 0) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
            />
          </Box>

          {/* Zone d'input */}
          <View
            style={{
              padding: 10,
              backgroundColor: 'white',
              borderTopLeftRadius: selectedImage ? 25 : 0,
              borderTopRightRadius: selectedImage ? 25 : 0,
            
            }}
          >
            {/* Affichage de l'image sélectionnée */}
            {selectedImage && (
              <View
                style={{
                  marginBottom: 10,
                  borderRadius: 15,
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: 'transparent',
                }}
              >
                <Image
                  alt='img-chat'
                  source={{ uri: selectedImage.uri }}
                  style={{
                    height: 200,
                    borderRadius: 15,
                  }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(null);
                  }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: '#94A3B833',
                    borderRadius: 15,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {/* Champ de saisie et boutons */}
            <HStack space={2} alignItems="center">
              {/* Bouton d'ajout */}
              <TouchableOpacity
                onPress={handleImagePick}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}
              >
                <MaskedView
                  maskElement={
                    <View style={{ backgroundColor: 'transparent' }}>
                      <FontAwesomeIcon
                        icon={faPlus}
                        color="white"
                        size={22}
                      />
                    </View>
                  }
                >
                  <LinearGradient
                    colors={['#FF587E', '#CC4B8D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 22,
                      height: 22,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  />
                </MaskedView>
              </TouchableOpacity>

              {/* Champ de saisie */}
              <Box
                flex={1}
                borderRadius={borderRadius}
                overflow="hidden"
                position="relative"
              >
                <Input
                  value={message}
                  onChangeText={setMessage}
                  placeholder={selectedImage ? "Envoyer" : "Message"}
                  placeholderTextColor="#8E8E93"
                  color="#8E8E93"
                  _focus={{ 
                    color: "#8E8E93",
                    borderColor: '#94A3B866'  // Un peu plus visible en focus
                  }}
                  fontSize="16px"
                  paddingX={4}
                  paddingY={2}
                  paddingRight={12}
                  borderWidth={1}
                  borderColor='#94A3B833'
                  style={{
                    minHeight: 36,
                    maxHeight: 100,
                  }}
                  multiline
                  onContentSizeChange={(event) => {
                    const height = event.nativeEvent.contentSize.height;
                    setInputHeight(height);
                    setBorderRadius(calculateBorderRadius(height));
                  }}
                />

                {/* Bouton d'envoi */}
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!message.trim() && !selectedImage}
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: '55%',
                    transform: [{ translateY: -18 }],
                    width: 32,
                    height: 32,
                    borderRadius: 18,
                    overflow: 'hidden'
                  }}
                >
                  <View style={{
                    width: '100%',
                    height: '100%',
                    opacity: (!message.trim() && !selectedImage) ? 0.5 : 1
                  }}>
                    <LinearGradient
                      colors={['#FF587E', '#CC4B8D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: '100%',
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <FontAwesomeIcon icon={faArrowUp} size={16} color="white" />
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </Box>
            </HStack>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

    {/* Modal reste inchangé */}
    <Modal isOpen={isModalVisible} onClose={() => setModalVisible(false)}>
      <View width='100%' style={{ flex: 1 }}>
        <BlurView
          style={[
            styles.blurBackground,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }
          ]}
          blurType="light"
          blurAmount={8}
          reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
        >
          <Modal.Content
            width="90%"
            style={{
              ...styles.shadowBox,
              shadowColor: Platform.OS === 'ios' ? 'violet' : undefined,
              shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
              shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined,
              shadowRadius: Platform.OS === 'ios' ? 5 : undefined,
              elevation: 5,
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16
            }}
          >
            <Modal.CloseButton
              _icon={{
                color: "#94A3B8",
                size: "sm"
              }}
            />

            <VStack justifyContent="space-between" width='100%' space={2} flexGrow={1} flexShrink={1}>
              {/* Header */}
              <HStack space={2} justifyContent="start">
                <Text style={styles.h5}>
                  {secretData && secretData.user ? `Posté par ${secretData.user.name}` : 'Posté par Utilisateur'}
                </Text>
              </HStack>

              <Text paddingVertical={100} style={styles.h3}>
                "{secretData?.content}"
              </Text>

              {/* Footer */}
              <HStack justifyContent='space-between' mt={4}>
                <Text style={styles.caption}>{secretData?.label}</Text>
                <Text color='#FF78B2' mt={1} style={styles.littleCaption}>
                  Expire dans {timeLeft}
                </Text>
              </HStack>
            </VStack>
          </Modal.Content>
        </BlurView>
      </View>
    </Modal>
  </Background>
  );
};

export default ChatScreen;