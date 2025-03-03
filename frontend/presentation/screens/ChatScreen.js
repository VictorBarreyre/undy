import React, { useState, useEffect, useContext, useRef } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { Box, Input, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faPlus, faTimes, faArrowUp } from '@fortawesome/free-solid-svg-icons';
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
import * as RN from 'react-native';
import MessageItem from '../components/MessageItem';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';


const ChatScreen = ({ route }) => {
  const { conversationId, secretData, conversation, showModalOnMount } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, markConversationAsRead, uploadImage } = useCardData();
  const { userData } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isModalVisible, setModalVisible] = useState(showModalOnMount || false);
  const isInitialMount = useRef(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inputContainerHeight, setInputContainerHeight] = useState(60);
  const [inputHeight, setInputHeight] = useState(36);
  const [borderRadius, setBorderRadius] = useState(18);
  const flatListRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(Platform.OS === 'ios' ? 60 : 0);
  const [isScrolling, setIsScrolling] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [firstUnreadMessageIndex, setFirstUnreadMessageIndex] = useState(-1);


  useEffect(() => {
    if (conversation?.messages && conversation.unreadCount && userData?._id) {
      // Récupérer le nombre de messages non lus
      let currentUnreadCount = 0;
      
      // Vérifier le type de unreadCount (Map ou objet)
      if (conversation.unreadCount instanceof Map) {
        currentUnreadCount = conversation.unreadCount.get(userData._id.toString()) || 0;
      } else if (typeof conversation.unreadCount === 'object') {
        currentUnreadCount = conversation.unreadCount[userData._id] || 0;
      }

      // Trouver l'index du premier message non lu
      const unreadStartIndex = Math.max(0, messages.length - currentUnreadCount);
      const unreadIndex = messages.findIndex(
        (msg, index) => index >= unreadStartIndex && msg.type !== 'separator'
      );

      console.log('Unread Count:', currentUnreadCount);
      console.log('Unread Start Index:', unreadStartIndex);
      console.log('First Unread Message Index:', unreadIndex);

      setUnreadCount(currentUnreadCount);
      setFirstUnreadMessageIndex(unreadIndex);
    }
  }, [conversation, messages, userData?._id]);



  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    // Vérifier si l'utilisateur a atteint le bas de la liste
    const isBottomReached = 
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    // Si on a atteint le bas ET qu'il y a des messages non lus
    if (isBottomReached && unreadCount > 0) {
      markConversationAsRead(conversationId, userToken);
      setUnreadCount(0);
      setHasScrolledToBottom(true);
    }
  };



  // Ajouter cet effet dans le ChatScreen
  useEffect(() => {
    // Gestionnaire d'événement pour le focus sur l'écran
    const unsubscribe = navigation.addListener('focus', async () => {
      if (conversationId) {
        try {
          // Créer une fonction pour rafraîchir la conversation complète
          const fetchConversationData = async () => {
            const instance = getAxiosInstance();
            if (!instance) return;

            // Récupérer la conversation complète (pas seulement les messages)
            const response = await instance.get(`/api/secrets/conversations/secret/${conversation.secret._id}`);

            // Mettre à jour le state local ou les paramètres de navigation
            if (response.data) {
              // Option 1: Mettre à jour directement les paramètres de route
              navigation.setParams({ conversation: response.data });

              // Option 2: Ou mettre à jour un état local si vous préférez
              // setConversationData(response.data);
            }
          };

          // Exécuter la fonction de récupération
          await fetchConversationData();
        } catch (error) {
          console.error('Erreur lors du rechargement de la conversation:', error);
        }
      }
    });

    // Nettoyer l'abonnement lorsque le composant est démonté
    return unsubscribe;
  }, [navigation, conversationId, conversation?.secret?._id]);

  // Gestion du clavier
  useEffect(() => {
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

  // Initialisation et marquage comme lu
  useEffect(() => {
    const initialize = async () => {
      if (conversationId) {
        try {
          // Marquer comme lu
          await markConversationAsRead(conversationId);
          console.log("Conversation marquée comme lue");
        } catch (error) {
          console.error('Erreur lors du marquage comme lu:', error);
        }
      }
    };

    initialize();

    // Gestion de la modale au montage
    if (isInitialMount.current && showModalOnMount) {
      setModalVisible(true);
      isInitialMount.current = false;
    }
  }, [conversationId, markConversationAsRead, showModalOnMount]);

  useEffect(() => {
    if (conversation?.messages) {
      const userMapping = {};
      conversation.participants?.forEach(participant => {
        userMapping[participant._id] = {
          name: participant.name,
          profilePicture: participant.profilePicture
        };
      });

      const formattedMessages = [];
      let lastMessageDate = null;

      const sortedMessages = [...conversation.messages].sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );

      sortedMessages.forEach((msg, index) => {
        if (!msg.createdAt) {
          console.warn("Message sans createdAt:", msg);
          return;
        }

        const currentMessageDate = new Date(msg.createdAt);

        // Détecter si le message provient de l'utilisateur actuel
        const isCurrentUser = 
          (msg.sender && typeof msg.sender === 'object' ? msg.sender._id : msg.sender) === userData._id;

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

        // Message avec le nom de l'expéditeur
        const messageSenderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;

        formattedMessages.push({
          id: msg._id || `msg-${index}`,
          text: msg.content,
          sender: isCurrentUser ? 'user' : 'other',
          timestamp: msg.createdAt,
          messageType: isImageMessage ? 'image' : 'text',
          image: msg.image,
          senderInfo: {
            id: messageSenderId,
            name: userMapping[messageSenderId]?.name || msg.senderName || 'Utilisateur',
            profilePicture: userMapping[messageSenderId]?.profilePicture || null
          }
        });

        lastMessageDate = currentMessageDate;
      });

      setMessages(formattedMessages);
    }
  }, [conversation, userData._id]);


  // Calcul du temps restant
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
    }, 60000);

    return () => clearInterval(timer);
  }, [conversation.expiresAt]);

  // Gestion de l'image sélectionnée
  useEffect(() => {
    updateInputAreaHeight(!!selectedImage);

    if (selectedImage && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      });
    }
  }, [selectedImage]);

  // Mise à jour de la hauteur de la zone d'input
  const updateInputAreaHeight = (imageVisible) => {
    const newHeight = imageVisible ? 280 : 60;
    setInputContainerHeight(newHeight);
  };

  // Envoi de message
  const sendMessage = async () => {
    try {
      if (!conversationId) {
        throw new Error('ID de conversation manquant');
      }

      // Vérifier s'il y a du contenu à envoyer
      if (!message.trim() && !selectedImage) return;

      if (!userData?.name) {
        throw new Error('Informations utilisateur manquantes');
      }

      // Déterminer le type de message
      let messageType = 'text';
      if (selectedImage && message.trim()) {
        messageType = 'mixed';
      } else if (selectedImage) {
        messageType = 'image';
      }

      // Créer l'objet du message
      let messageContent = {
        content: message.trim() || " ",
        senderName: userData.name,
        messageType: messageType
      };

      // Si une image est sélectionnée, l'uploader
      if (selectedImage) {
        try {
          let imageData;
          if (selectedImage.base64) {
            imageData = `data:${selectedImage.type};base64,${selectedImage.base64}`;
          } else if (selectedImage.uri) {
            imageData = selectedImage.uri;
          }

          const uploadResult = await uploadImage(imageData);
          messageContent.image = uploadResult.url;
        } catch (uploadError) {
          console.error('Erreur lors de l\'upload de l\'image:', uploadError);
          throw new Error('Échec de l\'upload de l\'image');
        }
      }

      // Envoyer le message
      const newMessage = await handleAddMessage(conversationId, messageContent);
      console.log("Message envoyé avec succès:", newMessage);

      // Mise à jour de l'UI
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

      // Réinitialiser
      setMessage('');
      setSelectedImage(null);
      updateInputAreaHeight(false);

      // Défiler vers le bas
      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  // Sélection d'image
  const handleImagePick = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        updateInputAreaHeight(true);

        requestAnimationFrame(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection d\'image:', error);
    }
  };

  // Calcul du border radius en fonction de la hauteur
  const calculateBorderRadius = (height) => {
    if (height <= 40) {
      return 18;
    } else if (height <= 60) {
      return 15;
    } else {
      return 10;
    }
  };

  // Configuration du détecteur de geste pour les timestamps
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: new Animated.Value(0) }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -100) {
          setShowTimestamps(true);
        } else if (gestureState.dx > 100) {
          setShowTimestamps(false);
        }

        Animated.spring(new Animated.Value(gestureState.dx), {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: false
        }).start();
      }
    })
  ).current;

  // Fonction de rendu des messages
  const renderMessage = ({ item, index }) => {
    return (
      <MessageItem
        key={item.id}
        item={item}
        index={index}
        messages={messages}
        userData={userData}
        showTimestamps={showTimestamps}
      />
    );
  };

  const scrollToUnreadMessages = () => {
    if (firstUnreadMessageIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: firstUnreadMessageIndex,
        animated: true,
      });
  
      // Marquer la conversation comme lue
      markConversationAsRead(conversationId);
      setUnreadCount(0);
      setHasScrolledToBottom(true);
    }
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
          <Box flex={1}>
         
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingBottom: 20,
                }}
                onContentSizeChange={() => {
                  if (flatListRef.current) {
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
                    borderColor: '#94A3B866'
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

     {/* Badge de messages non lus */}
     {!hasScrolledToBottom && unreadCount > 0 && (
        <TouchableOpacity 
          onPress={scrollToUnreadMessages}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: '#FF78B2',
            borderRadius: 25,
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {unreadCount}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal pour afficher le secret complet */}
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