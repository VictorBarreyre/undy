import React, { useState, useEffect, useContext, useRef, memo, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated, PanResponder } from 'react-native';
import { Box, Input, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
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

const ChatScreen = ({ route }) => {
  const { conversationId, secretData, conversation, showModalOnMount } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, markConversationAsRead, uploadImage, refreshUnreadCounts } = useCardData();
  const { userData, userToken, isLoggedIn } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isModalVisible, setModalVisible] = useState(showModalOnMount || false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inputContainerHeight, setInputContainerHeight] = useState(60);
  const [inputHeight, setInputHeight] = useState(36);
  const [borderRadius, setBorderRadius] = useState(18);
  const [keyboardOffset, setKeyboardOffset] = useState(Platform.OS === 'ios' ? 60 : 0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [firstUnreadMessageIndex, setFirstUnreadMessageIndex] = useState(-1);
  const scrollPosition = useRef(0);
  const [scrollPositionState, setScrollPosition] = useState(0);


  // Références
  const flatListRef = useRef(null);
  const isManualScrolling = useRef(false);
  const scrollSaveTimeout = useRef(null);
  const scrollRestoreAttempts = useRef(0);
  const scrollRestorationComplete = useRef(false);
  const isRefreshingCountsRef = useRef(false);


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


    setUnreadCount(currentUnreadCount);
    if (currentUnreadCount > 0) {
      setHasScrolledToBottom(false);
    } else {
      setHasScrolledToBottom(true);
    }

    // Trouver l'index du premier message non lu
    if (messages.length > 0 && (currentUnreadCount > 0 || unreadCount > 0)) {
      const effectiveUnreadCount = Math.max(currentUnreadCount, unreadCount);
      const unreadStartIndex = Math.max(0, messages.length - effectiveUnreadCount);

      const unreadIndex = messages.findIndex(
        (msg, index) => index >= unreadStartIndex && msg.type !== 'separator'
      );

      if (unreadIndex > -1) {
        setFirstUnreadMessageIndex(unreadIndex);
      } else {
        setFirstUnreadMessageIndex(messages.length - 1);
      }
    }
  }, [conversation, messages, userData?._id, unreadCount, hasScrolledToBottom]);

  // Fonction pour sauvegarder la position de défilement dans AsyncStorage
  const saveScrollPosition = async (position) => {
    if (position > 0 && conversationId) {
      try {
        await AsyncStorage.setItem(`scroll_position_${conversationId}`, position.toString());
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la position:', error);
      }
    }
  };

  // Fonction pour charger la position de défilement depuis AsyncStorage
  const loadScrollPosition = async () => {
    if (!conversationId) return 0;

    try {
      const savedPosition = await AsyncStorage.getItem(`scroll_position_${conversationId}`);
      if (savedPosition) {
        const position = parseFloat(savedPosition);
        return position;
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la position:', error);
    }
    return 0;
  };

  const handleScrollOptimized = useCallback((event) => {
    // Vérifier que l'événement existe
    if (!event || !event.nativeEvent) return;
  
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
  
    // Vérification rapide pour les valeurs nécessaires
    if (!layoutMeasurement?.height || !contentOffset?.y || !contentSize?.height) return;
  
    // Ne pas enregistrer la position si c'est un défilement programmé
    if (!isManualScrolling.current) {
      // Mettre à jour la position sans setState pendant le défilement
      // pour éviter des re-renders excessifs
      const currentPosition = contentOffset.y;
      scrollPosition.current = currentPosition;
      
      // Débounce la sauvegarde et les mises à jour d'état
      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current);
      }
      
      scrollSaveTimeout.current = setTimeout(() => {
        // N'utiliser setState qu'après le débounce
        setScrollPosition(currentPosition);
        saveScrollPosition(currentPosition);
        
        // Vérifier si on est en bas pour marquer comme lu
        const isBottomReached = 
          (layoutMeasurement.height + currentPosition) >= (contentSize.height - 20);
          
        if (isBottomReached && unreadCount > 0) {
          markConversationAsRead(conversationId, userToken);
          setUnreadCount(0);
          setHasScrolledToBottom(true);
        }
      }, 300);
    }
  }, [unreadCount, conversationId, userToken]);

  // Restaurer la position de défilement
  const restoreScrollPosition = async () => {
    // Ne pas restaurer si déjà fait ou si trop de tentatives
    if (scrollRestorationComplete.current || scrollRestoreAttempts.current > 5) return;

    try {
      const position = await loadScrollPosition();
      if (position > 0 && flatListRef.current) {
        isManualScrolling.current = true;

        // Utiliser requestAnimationFrame pour s'assurer que le rendu est terminé
        requestAnimationFrame(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
              offset: position,
              animated: false
            });

            // Vérifier si la restauration a fonctionné après un délai
            setTimeout(() => {
              isManualScrolling.current = false;

              // Vérifier si nous sommes réellement à la bonne position
              if (Math.abs(scrollPosition - position) < 100) {
                scrollRestorationComplete.current = true;
              } else {
                // Réessayer jusqu'à 5 fois
                scrollRestoreAttempts.current += 1;
                if (scrollRestoreAttempts.current <= 5) {
                  setTimeout(() => restoreScrollPosition(), 500);
                }
              }
            }, 200);
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de la position:', error);
    }
  };

  // Gestion de la mise en page de la liste
  const onFlatListLayout = () => {
    if (messages.length > 0 && !scrollRestorationComplete.current) {
      restoreScrollPosition();
    }
  };

  // Navigation - focus/blur events
  useEffect(() => {
    // Récupérer les données de conversation quand on arrive sur l'écran
    const unsubscribeFocus = navigation.addListener('focus', async () => {
      // Réinitialiser les compteurs de tentatives à chaque focus
      scrollRestoreAttempts.current = 0;
      scrollRestorationComplete.current = false;

      // Essayer de restaurer la position de défilement
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
          console.error('Erreur lors du rechargement de la conversation:', error);
        }
      }
    });

    // Sauvegarder la position quand on quitte l'écran
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (scrollPosition > 0) {
        saveScrollPosition(scrollPosition);
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, conversationId, conversation?.secret?._id, messages.length, scrollPosition]);

  // Restaurer la position quand les messages changent
  useEffect(() => {
    if (messages.length > 0 && !scrollRestorationComplete.current) {
      setTimeout(() => restoreScrollPosition(), 300);
    }
  }, [messages]);

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

      // Message avec le nom de l'expéditeur
      const messageSenderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;

      formattedMessages.push({
        id: msg._id || `msg-${index}`,
        text: msg.content,
        sender: isCurrentUser ? 'user' : 'other',
        timestamp: msg.createdAt,
        messageType: msg.messageType,
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
  }, [conversation, userData?._id]);

  // Calcul du temps restant
  useEffect(() => {
    if (!conversation?.expiresAt) return;

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
  }, [conversation?.expiresAt]);

  // Gestion de l'image sélectionnée
  useEffect(() => {
    updateInputAreaHeight(!!selectedImage);

    if (selectedImage && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      });
    }
  }, [selectedImage]);

  useEffect(() => {
    let timer = null;
    if (unreadCount === 0 && hasScrolledToBottom) {
      timer = setTimeout(() => {
        safeRefreshUnreadCounts();
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [unreadCount, hasScrolledToBottom, safeRefreshUnreadCounts]);


  const safeRefreshUnreadCounts = useCallback(() => {
    // Ne rien faire si un rafraîchissement est déjà en cours
    if (isRefreshingCountsRef.current) return;

    // Définir le drapeau à true pour éviter les appels parallèles
    isRefreshingCountsRef.current = true;

    // Appeler la fonction originale
    refreshUnreadCounts().finally(() => {
      // Réinitialiser le drapeau après l'exécution (qu'elle réussisse ou échoue)
      setTimeout(() => {
        isRefreshingCountsRef.current = false;
      }, 2000); // Attendre au moins 2 secondes entre les rafraîchissements
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

          const imageMetadata = {
            width: selectedImage.width || 0,
            height: selectedImage.height || 0,
            fileSize: selectedImage.fileSize || 0
          };

          const uploadResult = await uploadImage(imageData);
          messageContent.image = uploadResult.url;
        } catch (uploadError) {
          console.error('Erreur lors de l\'upload de l\'image:', uploadError);
          throw new Error('Échec de l\'upload de l\'image');
        }
      }

      // Envoyer le message
      const newMessage = await handleAddMessage(conversationId, messageContent);

      // Mise à jour de l'UI
      setMessages(prev => [...prev, {
        id: newMessage._id || `local-${Date.now()}`,
        text: message.trim() || "",
        messageType: messageContent.messageType || "text",
        // Initialiser image à undefined ou à une chaîne vide, mais JAMAIS à null
        image: messageContent.image || "",
        sender: 'user',
        timestamp: new Date().toISOString(),
        senderInfo: {
          id: userData?._id || "",
          name: userData?.name || "Utilisateur"
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
    if (height <= 40) return 18;
    if (height <= 60) return 15;
    return 10;
  };

  // Fonction pour défiler vers les messages non lus
  const scrollToUnreadMessages = () => {
    if (firstUnreadMessageIndex !== -1 && flatListRef.current) {
      // Défilement vers le premier message non lu
      flatListRef.current.scrollToIndex({
        index: firstUnreadMessageIndex,
        animated: true,
        viewPosition: 0,
        viewOffset: 50,
      });

      // Attendre que l'animation de défilement soit terminée avant de marquer comme lu
      setTimeout(() => {
        markConversationAsRead(conversationId, userToken);
        setUnreadCount(0);
        setHasScrolledToBottom(true);
      }, 300);
    } else {
      // Fallback: si l'index n'est pas trouvé, défiler tout en bas
      flatListRef.current?.scrollToEnd({ animated: true });

      // Marquer quand même comme lu
      markConversationAsRead(conversationId, userToken);
      setUnreadCount(0);
      setHasScrolledToBottom(true);
    }
  };

  // Gestion de l'échec du défilement vers un index
  const onScrollToIndexFailed = (info) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      markConversationAsRead(conversationId, userToken);
      setUnreadCount(0);
      setHasScrolledToBottom(true);
    }, 100);
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




  const MemoizedMessageItem = memo(MessageItem, (prevProps, nextProps) => {
    // Comparaison optimisée pour éviter les re-renders inutiles
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.showTimestamps === nextProps.showTimestamps &&
      prevProps.index === nextProps.index &&
      // Pour les objets complexes, comparer uniquement l'ID
      prevProps.userData?._id === nextProps.userData?._id &&
      // Éviter la re-rendu lors des changements d'état qui ne concernent pas les messages
      prevProps.item.text === nextProps.item.text &&
      prevProps.item.image === nextProps.item.image
    );
  });



  // Puis dans la renderItem de FlatList
  const renderMessage = useCallback(({ item, index }) => {
    // Protéger contre les items null
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
              keyExtractor={item => item?.id?.toString() || Math.random().toString()}

              // Optimisations de performance
              windowSize={7}                    // Augmenter la taille de la fenêtre de rendu (5 → 7)
              removeClippedSubviews={true}      // Garder cette propriété
              maxToRenderPerBatch={5}          // Augmenter légèrement (3 → 5)
              initialNumToRender={10}           // Augmenter légèrement pour un premier chargement plus fluide
              updateCellsBatchingPeriod={50}    // Réduire ce délai (100 → 50) pour un rendu plus réactif

              // Améliorer le défilement
              onScroll={handleScrollOptimized}  // Utiliser une version optimisée du gestionnaire
              scrollEventThrottle={16}          // 16ms = 60fps, standard pour une animation fluide

              // Supprimer getItemLayout problématique, sauf si vous pouvez calculer la hauteur exacte
              // getItemLayout={...}            // À supprimer ou à remplacer par une implémentation précise

              // Ajouter un maintainVisibleContentPosition pour empêcher le saut lors de l'ajout de nouveaux messages
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}

              // Désactiver le "bounce" sur iOS pour un défilement plus fluide
              bounces={false}

              // Optimisations de liste
              ListEmptyComponent={<Text style={styles.caption}>Aucun message</Text>}
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
                  placeholder={selectedImage ? "Envoyer" : "Message"}
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
      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={scrollToUnreadMessages}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            borderRadius: 25,
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 999, // Assurer que c'est au-dessus de tout
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
          <Text style={{ color: 'white', fontWeight: 'bold', zIndex: 1 }}>
          Nouveaux messages
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