import React, { useState, useEffect, useContext, useRef } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated } from 'react-native';
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
  const { handleAddMessage, getConversationMessages, markConversationAsRead } = useCardData();
  const { userData } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [isTimestampVisible, setIsTimestampVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isModalVisible, setModalVisible] = useState(showModalOnMount || false);
  const isInitialMount = useRef(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inputContainerHeight, setInputContainerHeight] = useState(60);
  const [inputHeight, setInputHeight] = useState(36); // hauteur par défaut
  const [borderRadius, setBorderRadius] = useState(18); // rayon par défaut
  const flatListRef = useRef(null);
  const [listContentHeight, setListContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

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
  
      // Vérifier si on a du texte ou une image
      if (!message.trim() && !selectedImage) return;
  
      // S'assurer que userData.name existe
      if (!userData?.name) {
        throw new Error('Informations utilisateur manquantes');
      }
  
      let messageContent = {
        content: message.trim(),
        senderName: userData.name,
        messageType: selectedImage ? 'image' : 'text' // Ajouter explicitement le type
      };
  
      let imageUri = null;
  
      if (selectedImage) {
        imageUri = selectedImage.uri; // Sauvegarde de l'URI pour l'affichage local
        
        const formData = new FormData();
        formData.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || 'image.jpg'
        });
  
        messageContent = {
          ...messageContent,
          image: formData,
          messageType: 'image'
        };
      }
  
      const newMessage = await handleAddMessage(conversationId, messageContent);
  
      // Ajouter le message à la liste avec tous les champs nécessaires
      setMessages(prev => [...prev, {
        id: newMessage._id || `local-${Date.now()}`, // Fallback pour ID local si nécessaire
        text: message,
        messageType: selectedImage ? 'image' : 'text',
        image: imageUri, // Utiliser l'URI sauvegardé
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
      
      // Défiler vers le bas après l'ajout du message
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

  const renderMessage = ({ item }) => {
    if (item.type === 'separator') {
      return (
        <Text textAlign="center" color="#94A3B8" my={2}>
          {formatMessageTime(item.timestamp)}
        </Text>
      );
    }
  
    return (
      <VStack>
        <HStack
          space={1}
          alignSelf={item.sender === 'user' ? 'flex-end' : 'flex-start'}
          m={2}
        >
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
          <VStack maxW="80%">
            {item.sender !== 'user' && (
              <Text
                style={styles.littleCaption}
                color="#94A3B8"
                ml={2}
              >
                {item.senderInfo?.name || 'Utilisateur'}
              </Text>
            )}
  
            <Pressable onPress={() => setIsTimestampVisible(!isTimestampVisible)}>
              <Box
                p={3}
                borderRadius={20}
                style={{
                  marginVertical: 4,
                  marginHorizontal: 8,
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
                
                {/* Vérifier si c'est un message image */}
                {item.messageType === 'image' || item.image ? (
                  <Image
                    alt="Message image"
                    source={{ uri: item.image }}
                    style={{
                      width: 200, 
                      height: 200,
                      borderRadius: 10
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    color={item.sender === 'user' ? 'white' : 'black'}
                    style={styles.caption}
                  >
                    {item.text}
                  </Text>
                )}
  
                {isTimestampVisible && (
                  <Text
                    style={styles.littleCaption}
                    color={item.sender === 'user' ? 'white' : 'gray.500'}
                    textAlign={item.sender === 'user' ? 'right' : 'left'}
                    mr={item.sender === 'user' ? 2 : 0}
                    ml={item.sender === 'user' ? 0 : 2}
                  >
                    {formatMessageTime(item.timestamp)}
                  </Text>
                )}
              </Box>
            </Pressable>
          </VStack>
  
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
      </VStack>
    );
  };

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <Box style={{ flex: 1 }}>
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
          
          <Box style={{ flex: 1, marginBottom: inputContainerHeight }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{
                flexGrow: 1,
                marginTop: 20,
                paddingBottom: 20,
                paddingHorizontal: 10
              }}
              onContentSizeChange={(contentWidth, contentHeight) => {
                setListContentHeight(contentHeight);
                // Défiler automatiquement vers le bas à chaque changement de taille du contenu
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setContainerHeight(height);
                // Défiler automatiquement après le premier rendu
                if (flatListRef.current && messages.length > 0) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10
              }}
            />
          </Box>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 0}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {/* Conteneur principal avec fond sombre comme iMessage */}
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

                  {/* Bouton de fermeture dans un cercle gris translucide */}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedImage(null);
                      updateInputAreaHeight(false);
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
              <HStack
                space={2}
                alignItems="center"
              >
                {/* Bouton d'ajout (plus) */}
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

                {/* Champ de saisie avec style iMessage */}
                <Box
                  flex={1}
                  borderRadius={borderRadius}
                  overflow="hidden"
                  position="relative" // Important pour le positionnement absolu du bouton
                >
                  <Input
                    value={message}
                    onChangeText={setMessage}
                    placeholder={selectedImage ? "Envoyer" : "Message"}
                    placeholderTextColor="#8E8E93"
                    color="#8E8E93"
                    fontSize="16px"
                    paddingX={4}
                    paddingY={2}
                    paddingRight={12} // Ajouter plus d'espace à droite pour le bouton
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

                  {/* Bouton d'envoi positionné à l'intérieur de l'input */}
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!message.trim() && !selectedImage}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '55%',
                      transform: [{ translateY: -18 }], // Moitié de la hauteur du bouton pour le centrer
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
        </Box>
      </SafeAreaView>

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
                  color: "#94A3B8",  // La même couleur que votre icône ellipsis
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