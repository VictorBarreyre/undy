import React, { useState, useEffect, useContext, useRef, memo, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated, PanResponder } from 'react-native';
import { Box, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faPlus, faTimes, faArrowUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
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
import { getAxiosInstance } from '../../data/api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageManipulator from 'react-native-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters';

const ChatScreen = ({ route }) => {
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();
  const { conversationId, secretData, conversation, showModalOnMount } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, markConversationAsRead, uploadImage, refreshUnreadCounts } = useCardData();
  const { userData, userToken } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isModalVisible, setModalVisible] = useState(showModalOnMount || false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inputContainerHeight, setInputContainerHeight] = useState(60);
  const [inputHeight, setInputHeight] = useState(36);
  const [borderRadius, setBorderRadius] = useState(18);
  const [keyboardOffset, setKeyboardOffset] = useState(Platform.OS === 'ios' ? 60 : 0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // État unifié pour les messages non lus
  const [unreadState, setUnreadState] = useState({
    count: 0,
    hasScrolledToBottom: false,
    showButton: false
  });

  // Références
  const flatListRef = useRef(null);
  const isManualScrolling = useRef(false);
  const scrollPosition = useRef(0);
  const scrollSaveTimeout = useRef(null);
  const isRefreshingCountsRef = useRef(false);


  const prepareImageForUpload = async (imageUri) => {
  // Définir la taille maximale
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 1200;
  
  try {
    // Redimensionner l'image
    const manipResult = await ImageManipulator.manipulate(
      imageUri,
      [
        {
          resize: {
            width: MAX_WIDTH,
            height: MAX_HEIGHT,
          },
        },
      ],
      { compress: 0.7, format: 'jpeg' }
    );
    
    return manipResult.uri;
  } catch (error) {
    console.error(t('chat.errors.resizing'), error);
    // En cas d'erreur, retourner l'URI originale
    return imageUri;
  }
};

  // Analyse des données de conversation pour les messages non lus
  useEffect(() => {
    if (!conversation || !userData) return;

    // Récupérer le nombre de messages non lus
    let currentUnreadCount = 0;
    let userIdStr = userData?._id?.toString() || '';

    // Si unreadCount est un nombre, utilisez-le directement
    if (typeof conversation.unreadCount === 'number') {
      currentUnreadCount = conversation.unreadCount;
    }
    // Sinon, essayez de l'accéder comme un objet/map
    else if (conversation.unreadCount && userData?._id) {
      if (conversation.unreadCount instanceof Map) {
        currentUnreadCount = conversation.unreadCount.get(userIdStr) || 0;
      } else if (typeof conversation.unreadCount === 'object') {
        currentUnreadCount = conversation.unreadCount[userIdStr] || 0;
      }
    }

    setUnreadState(prev => ({
      count: currentUnreadCount,
      hasScrolledToBottom: currentUnreadCount === 0,
      showButton: currentUnreadCount > 0
    }));
  }, [conversation, userData?._id]);

  // Fonction pour sauvegarder la position de défilement dans AsyncStorage
  const saveScrollPosition = async (position) => {
    if (position > 0 && conversationId) {
      try {
        await AsyncStorage.setItem(`scroll_position_${conversationId}`, position.toString());
      } catch (error) {
        console.error(t('chat.errors.saveScrollPosition'), error);
      }
    }
  };

  // Fonction pour charger la position de défilement depuis AsyncStorage
  const loadScrollPosition = async () => {
    if (!conversationId) return 0;

    try {
      const savedPosition = await AsyncStorage.getItem(`scroll_position_${conversationId}`);
      if (savedPosition) {
        return parseFloat(savedPosition);
      }
    } catch (error) {
      console.error(t('chat.errors.loadScrollPosition'), error);
    }
    return 0;
  };

  // Gestionnaire de défilement optimisé
  const handleScrollOptimized = useCallback((event) => {
    if (!event?.nativeEvent) return;

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (!layoutMeasurement?.height || !contentOffset?.y || !contentSize?.height) return;

    if (!isManualScrolling.current) {
      const currentPosition = contentOffset.y;
      scrollPosition.current = currentPosition;

      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current);
      }

      scrollSaveTimeout.current = setTimeout(() => {
        saveScrollPosition(currentPosition);

        const isBottomReached = (layoutMeasurement.height + currentPosition) >= (contentSize.height - 20);
        if (isBottomReached && unreadState.count > 0) {
          markConversationAsRead(conversationId, userToken);

          setUnreadState({
            count: 0,
            hasScrolledToBottom: true,
            showButton: false
          });
        }
      }, 300);
    }
  }, [unreadState.count, conversationId, userToken]);

  // Restaurer la position de défilement
  const restoreScrollPosition = async () => {
    try {
      const position = await loadScrollPosition();
      if (position > 0 && flatListRef.current) {
        isManualScrolling.current = true;
        flatListRef.current.scrollToOffset({
          offset: position,
          animated: false
        });

        setTimeout(() => {
          isManualScrolling.current = false;
        }, 200);
      }
    } catch (error) {
      console.error(t('chat.errors.restoreScrollPosition'), error);
    }
  };

  // Gestion de la mise en page de la liste
  const onFlatListLayout = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => restoreScrollPosition(), 300);
    }
  }, [messages.length]);

  // Navigation - focus/blur events
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', async () => {
      if (messages.length > 0) {
        setTimeout(() => restoreScrollPosition(), 500);
      }

      // Récupérer les données de conversation à jour
      if (conversationId && conversation?.secret?._id) {
        try {
          const instance = getAxiosInstance();
          if (!instance) return;

          const response = await instance.get(`/api/secrets/conversations/secret/${conversation.secret._id}`);

          if (response.data) {
            const updatedConversation = {
              ...response.data,
              unreadCount: response.data.unreadCount || (conversation && conversation.unreadCount) || 0
            };

            navigation.setParams({
              conversation: updatedConversation,
              doNotMarkAsRead: true
            });
          }
        } catch (error) {
          console.error(t('chat.errors.reloadConversation'), error);
        }
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (scrollPosition.current > 0) {
        saveScrollPosition(scrollPosition.current);
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, conversationId, conversation?.secret?._id, messages.length, t]);

  // Nettoyage des timeouts
  useEffect(() => {
    return () => {
      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current);
      }
    };
  }, []);

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

  // Formatage des messages
  useEffect(() => {
    if (!conversation?.messages || !userData) return;

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
        console.warn(t('chat.errors.missingCreatedAt'), msg);
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
          timestamp: msg.createdAt,
          // Ajoutez la date formatée pour l'affichage
          formattedDate: dateFormatter.formatDateOnly(msg.createdAt)
        });
      }

      // Message avec le nom de l'expéditeur
      const messageSenderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;

      formattedMessages.push({
        id: msg._id || `msg-${index}`,
        text: msg.content,
        sender: isCurrentUser ? 'user' : 'other',
        timestamp: msg.createdAt,
        // Ajoutez la date et l'heure formatées pour l'affichage
        formattedTime: dateFormatter.formatTimeOnly(msg.createdAt),
        formattedDate: dateFormatter.formatDate(msg.createdAt),
        messageType: msg.messageType,
        image: msg.image,
        senderInfo: {
          id: messageSenderId,
          name: userMapping[messageSenderId]?.name || msg.senderName || t('chat.defaultUser'),
          profilePicture: userMapping[messageSenderId]?.profilePicture || null
        }
      });

      lastMessageDate = currentMessageDate;
    });

    setMessages(formattedMessages);
  }, [conversation, userData?._id, t]);

  // Calcul du temps restant
  useEffect(() => {
    if (!conversation?.expiresAt) return;

    const calculateTimeLeft = () => {
      const expirationDate = new Date(conversation.expiresAt);
      const now = new Date();
      const difference = expirationDate - now;

      if (difference <= 0) {
        return t('chat.expired');
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      return t('chat.timeLeft', { days, hours, minutes });
    };

    setTimeLeft(dateFormatter.formatTimeLeft(conversation.expiresAt));
    const timer = setInterval(() => {
      setTimeLeft(dateFormatter.formatTimeLeft(conversation.expiresAt));
    }, 60000);

    return () => clearInterval(timer);
  }, [conversation?.expiresAt, t]);

  // Gestion de l'image sélectionnée
  useEffect(() => {
    updateInputAreaHeight(!!selectedImage);

    if (selectedImage && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      });
    }
  }, [selectedImage]);

  // Rafraichissement des compteurs de messages non lus
  useEffect(() => {
    let timer = null;
    if (unreadState.count === 0 && unreadState.hasScrolledToBottom) {
      timer = setTimeout(() => {
        safeRefreshUnreadCounts();
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [unreadState.count, unreadState.hasScrolledToBottom]);

  // Fonction pour rafraîchir les compteurs de messages non lus de façon contrôlée
  const safeRefreshUnreadCounts = useCallback(() => {
    if (isRefreshingCountsRef.current) return;

    isRefreshingCountsRef.current = true;

    refreshUnreadCounts().finally(() => {
      setTimeout(() => {
        isRefreshingCountsRef.current = false;
      }, 2000);
    });
  }, [refreshUnreadCounts]);

  // Mise à jour de la hauteur de la zone d'input
  const updateInputAreaHeight = (imageVisible) => {
    const newHeight = imageVisible ? 280 : 60;
    setInputContainerHeight(newHeight);
  };

 // Envoi de message
const sendMessage = async () => {
  try {
    if (!conversationId) {
      throw new Error(t('chat.errors.missingConversationId'));
    }

    // Vérifier s'il y a du contenu à envoyer
    if (!message.trim() && !selectedImage) return;

    if (!userData?.name) {
      throw new Error(t('chat.errors.missingUserInfo'));
    }

    // Déterminer le type de message
    let messageType = 'text';
    if (selectedImage && message.trim()) {
      messageType = 'mixed';
    } else if (selectedImage) {
      messageType = 'image';
    }

    // Créer un ID temporaire pour afficher immédiatement le message
    const tempId = `temp-${Date.now()}`;
    const messageText = message.trim() || "";
    
    // Ajouter immédiatement le message à l'interface avec état "en cours d'envoi"
    setMessages(prev => [...prev, {
      id: tempId,
      text: messageText,
      messageType: messageType,
      image: selectedImage ? selectedImage.uri : "",
      sender: 'user',
      timestamp: new Date().toISOString(),
      isSending: true,
      senderInfo: {
        id: userData?._id || "",
        name: userData?.name || t('chat.defaultUser')
      }
    }]);

    // Réinitialiser l'interface immédiatement pour une meilleure réactivité
    setMessage('');
    const imageToUpload = selectedImage;
    setSelectedImage(null);
    updateInputAreaHeight(false);

    // Défiler vers le bas
    requestAnimationFrame(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    });

    // Créer l'objet du message pour l'API
    let messageContent = {
      content: messageText || " ",
      senderName: userData.name,
      messageType: messageType
    };

    // Si une image est sélectionnée, l'uploader
    if (imageToUpload) {
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        // Utiliser directement la donnée base64
        let imageData;
        if (imageToUpload.base64) {
          // Utiliser directement base64 au lieu de redimensionner
          imageData = `data:${imageToUpload.type};base64,${imageToUpload.base64}`;
          
          // Uploader l'image
          const uploadResult = await uploadImage(
            imageData, 
            (progress) => setUploadProgress(progress)
          );
          
          messageContent.image = uploadResult.url;
        } else {
          throw new Error(t('chat.errors.unsupportedImageFormat'));
        }
      } catch (uploadError) {
        console.error(t('chat.errors.imageUpload'), uploadError);
        
        // Marquer le message comme échoué
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, sendFailed: true, isSending: false }
            : msg
        ));
        
        throw new Error(t('chat.errors.imageUploadFailed'));
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    // Envoyer le message
    try {
      const newMessage = await handleAddMessage(conversationId, messageContent);
      
      // Remplacer le message temporaire par le message réel
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? {
                ...msg,
                id: newMessage._id,
                image: messageContent.image || "",
                isSending: false
              }
            : msg
        )
      );
    } catch (error) {
      console.error(t('chat.errors.sendMessage'), error);
      
      // Marquer le message comme échoué
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, sendFailed: true, isSending: false }
            : msg
        )
      );
      
      throw error;
    }

  } catch (error) {
    console.error(t('chat.errors.sendMessage'), error);
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
      console.error(t('chat.errors.imageSelection'), error);
    }
  };

  // Calcul du border radius en fonction de la hauteur
  const calculateBorderRadius = (height) => {
    if (height <= 40) return 18;
    if (height <= 60) return 15;
    return 10;
  };

  // Fonction pour défiler vers les messages non lus
  const scrollToUnreadMessages = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });

      setTimeout(() => {
        markConversationAsRead(conversationId, userToken);

        setUnreadState({
          count: 0,
          hasScrolledToBottom: true,
          showButton: false
        });
      }, 300);
    }
  }, [conversationId, userToken]);

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

  // Composant de message mémorisé
  const MemoizedMessageItem = memo(MessageItem, (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.showTimestamps === nextProps.showTimestamps &&
      prevProps.index === nextProps.index &&
      prevProps.userData?._id === nextProps.userData?._id &&
      prevProps.item.text === nextProps.item.text &&
      prevProps.item.image === nextProps.item.image
    );
  });

  // Fonction de rendu des messages
  const renderMessage = useCallback(({ item, index }) => {
    if (!item || !item.id) return null;

    return (
      <MemoizedMessageItem
        key={item.id}
        item={item}
        index={index}
        messages={messages}
        userData={userData}
        showTimestamps={showTimestamps}
      />
    );
  }, [messages, userData, showTimestamps]);

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
                alt={t('chat.profilePicture')}
                size={12}
                rounded="full"
              />
              <VStack space={1} flex={1}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text style={styles.h5}>
                    {secretData?.user?.name || t('chat.defaultUser')}
                  </Text>
                  <Text style={styles.littleCaption} color="#94A3B8">
                    {t('chat.participants', { count: conversation?.participants?.length || 0 })}
                  </Text>
                </HStack>

                <HStack justifyContent='space-between'>
                  <Pressable onPress={() => setModalVisible(true)}>
                    <Text style={styles.littleCaption} color="#FF78B2">
                      {secretData?.content?.substring(0, 15)}...
                    </Text>
                  </Pressable>
                  <Text style={styles.littleCaption} color="#94A3B8">
                    {t('chat.expiresIn')} {timeLeft}
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
              keyExtractor={item => item?.id?.toString() || Math.random().toString()}
              windowSize={7}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              initialNumToRender={10}
              updateCellsBatchingPeriod={50}
              onScroll={handleScrollOptimized}
              scrollEventThrottle={16}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              bounces={false}
              ListEmptyComponent={() => (
                <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
                  <Text style={styles.caption} textAlign="center" color="#94A3B8" mt={2}>
                    {t('chat.sayHelloToStart')}
                  </Text>
                </VStack>
              )}
              onLayout={onFlatListLayout}
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
                  alt={t('chat.selectedImage')}
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
                <RN.TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={selectedImage ? t('chat.send') : t('chat.message')}
                  placeholderTextColor="#8E8E93"
                  style={{
                    minHeight: 36,
                    maxHeight: 100,
                    borderWidth: 1,
                    borderColor: '#94A3B833',
                    borderRadius: borderRadius,
                    padding: 10,
                    color: "#8E8E93"
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
      {unreadState.showButton && (
        <TouchableOpacity
          onPress={scrollToUnreadMessages}
          activeOpacity={1}
          style={{
            position: 'absolute',
            paddingHorizontal: 16,
            paddingVertical: 10,
            bottom: 80,
            right: 20,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 999,
            opacity: 0.5
          }}
        >
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
            }}
          />
          <Text style={{
            color: 'white',
            fontWeight: 'bold',
            zIndex: 1,
            marginRight: 5,
          }}>
            {t('chat.newMessages')}
          </Text>
          <FontAwesomeIcon
            icon={faChevronDown}
            size={12}
            color="white"
          />
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
                    {secretData && secretData.user 
                      ? t('chat.postedBy', { name: secretData.user.name }) 
                      : t('chat.postedByDefault')}
                  </Text>
                </HStack>

                <Text paddingVertical={100} style={styles.h3}>
                  "{secretData?.content}"
                </Text>

                {/* Footer */}
                <HStack justifyContent='space-between' mt={4}>
                  <Text style={styles.caption}>{secretData?.label}</Text>
                  <Text color='#FF78B2' mt={1} style={styles.littleCaption}>
                    {t('chat.expiresIn')} {timeLeft}
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