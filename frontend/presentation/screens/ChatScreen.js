import React, { useState, useEffect, useContext, useRef, memo, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated, PanResponder, Share, ActionSheetIOS } from 'react-native';
import { Box, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faPlus, faTimes, faArrowUp, faChevronDown, faPaperPlane, faCheck,faMicrophone, faStop, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { Background } from '../../navigation/Background';
import { TouchableOpacity } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { useCardData, ConfettiPresets } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import * as RN from 'react-native';
import MessageItem from '../components/MessageItem';
import { getAxiosInstance } from '../../data/api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageManipulator from 'react-native-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../../utils/dateFormatters';
import ReplyBanner from '../components/ReplyBanner';
import RNFS from 'react-native-fs';
import { AudioRecorder, AudioUtils } from 'react-native-audio';
import Sound from 'react-native-sound';

const ChatScreen = ({ route }) => {
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();
  const { conversationId, secretData, conversation, showModalOnMount } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, markConversationAsRead, uploadImage, refreshUnreadCounts, handleShareSecret, triggerConfetti } = useCardData();
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
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [playTime, setPlayTime] = useState('00:00');
  const [audioPath, setAudioPath] = useState('');
  const [audioLength, setAudioLength] = useState('');

  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const shareButtonScale = useRef(new Animated.Value(1)).current;
  const [isParticipantsModalVisible, setParticipantsModalVisible] = useState(false);

  const [replyToMessage, setReplyToMessage] = useState(null);

  const [isRecordingPermitted, setIsRecordingPermitted] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const soundRef = useRef(null);
  
  useEffect(() => {

    setTimeout(() => {
      if (Platform.OS === 'ios') {
        try {
          AudioRecorder.requestAuthorization().then((isAuthorized) => {
            console.log('Autorisation audio:', isAuthorized);
            setIsRecordingPermitted(isAuthorized);
          });
        } catch (error) {
          console.error('Erreur lors de l\'initialisation de l\'AudioRecorder:', error);
        }
      }
    }, 500);

    // Configuration initiale
    Sound.setCategory('Playback', true); // Activez la lecture audio même quand l'appareil est en mode silencieux
    
    // Préparer l'enregistreur pour iOS
    if (Platform.OS === 'ios') {
      AudioRecorder.requestAuthorization().then((isAuthorized) => {
        setIsRecordingPermitted(isAuthorized);
      });
    }
    
    // Nettoyage lors du démontage du composant
    return () => {
      if (isRecording) {
        AudioRecorder.stopRecording();
      }
      
      if (isPlaying && soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }
    };
  }, []);
  
  // Fonction pour vérifier les permissions
  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        
        return (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    else if (Platform.OS === 'ios') {
      // Pour iOS, utiliser l'autorisation déjà demandée
      return isRecordingPermitted;
    }
    
    return false;
  };
  
  // Fonction pour formater le temps (MM:SS)
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Démarrer l'enregistrement
  const startRecording = async () => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        Alert.alert(
          "Permission requise",
          "L'application a besoin d'accéder au microphone pour enregistrer des messages vocaux.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Paramètres", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      
      // Définir le chemin d'enregistrement
      const audioPath = `${AudioUtils.DocumentDirectoryPath}/recording_${Date.now()}.aac`;
      
      // Préparer l'enregistrement avec des options
      await AudioRecorder.prepareRecordingAtPath(audioPath, {
        SampleRate: 44100,
        Channels: 2,
        AudioQuality: "High",
        AudioEncoding: "aac",
        AudioEncodingBitRate: 128000,
        MeteringEnabled: true,
        IncludeBase64: false
      });
      
      // Événement de progression
      AudioRecorder.onProgress = (data) => {
        setRecordTime(formatTime(data.currentTime * 1000));
        setRecordingDuration(data.currentTime);
      };
      
      // Événement de fin d'enregistrement
      AudioRecorder.onFinished = (data) => {
        // data contient {status, audioFileURL}
        setAudioPath(data.audioFileURL || audioPath);
        setAudioLength(formatTime(recordingDuration * 1000));
      };
      
      // Démarrer l'enregistrement
      await AudioRecorder.startRecording();
      
      setIsRecording(true);
      setAudioPath(audioPath);
      
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement audio.");
    }
  };
  
  // Arrêter l'enregistrement
  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      const filePath = await AudioRecorder.stopRecording();
      console.log('Enregistrement terminé à:', filePath);
      
      setIsRecording(false);
      setAudioLength(formatTime(recordingDuration * 1000));
      
      // Le chemin est maintenant disponible dans audioPath
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      setIsRecording(false);
    }
  };
  
  // Lire l'enregistrement
  const startPlaying = () => {
    if (!audioPath) return;
    
    try {
      // Si un son est déjà en cours de lecture, le nettoyer
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }
      
      // Créer un nouvel objet Sound
      const sound = new Sound(audioPath, '', (error) => {
        if (error) {
          console.log('Erreur lors du chargement du son', error);
          return;
        }
        
        // Durée totale
        const duration = sound.getDuration();
        
        // Définir la référence
        soundRef.current = sound;
        
        // Démarrer la lecture
        sound.play((success) => {
          if (success) {
            console.log('Lecture terminée avec succès');
            setIsPlaying(false);
            setPlayTime('00:00');
          } else {
            console.log('Lecture terminée avec erreur');
          }
        });
        
        // Mettre à jour l'état
        setIsPlaying(true);
        
        // Mettre à jour le temps de lecture
        const interval = setInterval(() => {
          if (soundRef.current) {
            soundRef.current.getCurrentTime((seconds) => {
              setPlayTime(formatTime(seconds * 1000));
              
              // Si la lecture est terminée, nettoyer l'intervalle
              if (seconds >= duration) {
                clearInterval(interval);
              }
            });
          } else {
            clearInterval(interval);
          }
        }, 100);
      });
      
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      Alert.alert("Erreur", "Impossible de lire l'enregistrement audio.");
    }
  };
  
  // Arrêter la lecture
  const stopPlaying = () => {
    try {
      if (!soundRef.current || !isPlaying) return;
      
      // Arrêter la lecture
      soundRef.current.stop();
      setIsPlaying(false);
      setPlayTime('00:00');
      
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la lecture:', error);
      setIsPlaying(false);
    }
  };
  
  // Fonction pour préparer le fichier audio pour l'upload
  const prepareAudioForUpload = () => {
    if (!audioPath) return null;
    
    // Créer un objet FormData pour l'upload
    const formData = new FormData();
    formData.append('audio', {
      uri: Platform.OS === 'ios' ? audioPath.replace('file://', '') : audioPath,
      type: 'audio/aac',
      name: audioPath.split('/').pop(),
    });
    
    return formData;
  };
  

  const uploadAudio = async (audioUri, progressCallback) => {
    try {
      // Créer un objet FormData pour l'upload
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: audioUri.split('/').pop(),
      });
      
      // Effectuer la requête d'upload
      const response = await axios.post(
        `${API_BASE_URL}/messages/upload-audio`, 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${userToken}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progressCallback(percentCompleted);
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload audio:', error);
      throw error;
    }
  };

  const handleReplyToMessage = useCallback((message) => {
    // Création d'une référence visuelle à l'animation
    const animateMessage = (messageId) => {
      // Trouver le message dans la liste
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      // Créer une animation temporaire dans l'état
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        if (newMessages[messageIndex]) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            isHighlighted: true
          };
        }
        return newMessages;
      });

      // Effacer l'animation après quelques secondes
      setTimeout(() => {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          if (newMessages[messageIndex]) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              isHighlighted: false
            };
          }
          return newMessages;
        });
      }, 500);
    };

    // Animer le message avant de le sélectionner
    animateMessage(message.id);

    // Définir le message à répondre
    setReplyToMessage(message);

    // Mettre le focus sur le champ de texte
    if (inputRef.current) {
      // Ajouter un court délai pour laisser le temps à l'animation de se faire remarquer
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [messages]);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);


  const inputRef = useRef(null);


  const handleShare = async () => {
    try {
      if (!secretData) {
        console.error(t('chat.errors.missingSecretData'));
        return;
      }

      // Animation du bouton
      setIsSharing(true);
      Animated.sequence([
        Animated.timing(shareButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(shareButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();

      // Préparer l'objet secret
      const secretToShare = {
        _id: secretData._id || conversation?.secret?._id,
        label: secretData?.label,
        content: secretData?.content,
        shareLink: secretData?.shareLink || `hushy://secret/${secretData?._id || conversation?.secret?._id}`
      };

      // Partager le secret
      const result = await handleShareSecret(secretToShare);

      if (result && result.action === Share.sharedAction) {
        setShareSuccess(true);
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);  // Durée plus courte pour permettre de partager à nouveau rapidement
      }
    } catch (error) {
      console.error("Erreur lors du partage:", error);
      Alert.alert(t('cardHome.errors.title'), t('cardHome.errors.unableToShare'));
    } finally {
      // Important: Toujours réinitialiser isSharing pour permettre de nouveaux partages
      setTimeout(() => {
        setIsSharing(false);
      }, 500);  // Petit délai pour éviter les clics accidentels multiples
    }
  };

  useEffect(() => {
    if (showModalOnMount) {
      // Trigger confetti when the modal is first mounted
      triggerConfetti(ConfettiPresets.amazing);

      // Optional: You might want to set the modal to visible
      setModalVisible(true);
    }
  }, [showModalOnMount]);

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

        // Calculate if the bottom of the visible area reaches the bottom of the content
        const isBottomReached = (layoutMeasurement.height + currentPosition) >= (contentSize.height - 20);

        // Check if unread messages are visible
        const areUnreadMessagesVisible = (
          unreadState.count > 0 &&
          layoutMeasurement.height + contentOffset.y >= contentSize.height - (unreadState.count * 50) // Adjust 50 based on average message height
        );

        if (isBottomReached || areUnreadMessagesVisible) {
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
      if (!message.trim() && !selectedImage && !audioPath) return;
  
      if (!userData?.name) {
        throw new Error(t('chat.errors.missingUserInfo'));
      }
  
      // Déterminer le type de message
      let messageType = 'text';
      if (audioPath) {
        messageType = 'audio';
      } else if (selectedImage && message.trim()) {
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
        audio: audioPath || "",
        audioDuration: audioLength || "00:00",
        sender: 'user',
        timestamp: new Date().toISOString(),
        isSending: true,
        replyToMessage: replyToMessage,
        senderInfo: {
          id: userData?._id || "",
          name: userData?.name || t('chat.defaultUser')
        }
      }]);
  
      // Réinitialiser l'interface immédiatement pour une meilleure réactivité
      setMessage('');
      const imageToUpload = selectedImage;
      const audioToUpload = audioPath;
      setSelectedImage(null);
      setAudioPath('');
      setAudioLength('');
      setReplyToMessage(null);
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
  
      // Ajouter les informations de réponse si nécessaire
      if (replyToMessage) {
        messageContent.replyTo = replyToMessage.id;
        messageContent.replyToSender = replyToMessage.senderInfo?.id;
  
        // Si vous avez besoin de stocker plus d'informations sur le message répondu
        messageContent.replyData = {
          text: replyToMessage.text,
          sender: replyToMessage.senderInfo?.name || t('chat.defaultUser'),
          hasImage: !!replyToMessage.image,
          hasAudio: !!replyToMessage.audio
        };
      }
  
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
  
      // Si un audio est sélectionné, l'uploader
      if (audioToUpload) {
        setIsUploading(true);
        setUploadProgress(0);
  
        try {
          // Créer un objet FormData pour l'upload
          const formData = new FormData();
          formData.append('audio', {
            uri: Platform.OS === 'android' ? `file://${audioToUpload}` : audioToUpload,
            type: 'audio/m4a',
            name: audioToUpload.split('/').pop(),
          });
  
          // Uploader l'audio (vous devrez implémenter cette fonction)
          const uploadResult = await uploadAudio(
            formData,
            (progress) => setUploadProgress(progress)
          );
  
          messageContent.audio = uploadResult.url;
          messageContent.audioDuration = audioLength || "00:00";
        } catch (uploadError) {
          console.error(t('chat.errors.audioUpload'), uploadError);
  
          // Marquer le message comme échoué
          setMessages(prev => prev.map(msg =>
            msg.id === tempId
              ? { ...msg, sendFailed: true, isSending: false }
              : msg
          ));
  
          throw new Error(t('chat.errors.audioUploadFailed'));
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
                audio: messageContent.audio || "",
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


  const handleImagePick = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
        saveToPhotos: true,
      };

      const actionSheetOptions = {
        options: [
          t('chat.documentOptions.takePhoto'),        // Index 0 - Take Photo
          t('chat.documentOptions.chooseFromGallery'), // Index 1 - Choose from Gallery
          t('chat.documentOptions.cancel')             // Index 2 - Cancel
        ],
        cancelButtonIndex: 2,
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: actionSheetOptions.options,
            cancelButtonIndex: actionSheetOptions.cancelButtonIndex,
          },
          async (buttonIndex) => {
            switch (buttonIndex) {
              case 0: // Take Photo
                const cameraResult = await launchCamera(options);
                handleImageResult(cameraResult);
                break;
              case 1: // Choose from Gallery
                const galleryResult = await launchImageLibrary(options);
                handleImageResult(galleryResult);
                break;
            }
          }
        );
      } else {
        // Android handling
        const result = await launchCamera(options);
        handleImageResult(result);
      }
    } catch (error) {
      console.error(t('chat.errors.imageSelection'), error);
    }
  };

  // Helper function to handle image selection result
  const handleImageResult = (result) => {
    if (result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0]);
      updateInputAreaHeight(true);

      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      });
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
        onReplyToMessage={handleReplyToMessage} // Ajoutez ceci
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
                  <Text
                    style={styles.littleCaption}
                    color="#94A3B8"
                    onPress={() => setParticipantsModalVisible(true)}>
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
            {replyToMessage && (
              <ReplyBanner
                replyToMessage={replyToMessage}
                onCancelReply={handleCancelReply}
              />
            )}
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
            <HStack space={2} alignItems="flex-start">
              {/* Bouton d'ajout */}
              <TouchableOpacity
                onPress={handleImagePick}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  marginBottom: 2,
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

              {/* Bouton d'enregistrement vocal */}
              <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  marginBottom: 2,
                }}
              >
                <MaskedView
                  maskElement={
                    <View style={{ backgroundColor: 'transparent' }}>
                      <FontAwesomeIcon
                        icon={isRecording ? faStop : faMicrophone}
                        color="white"
                        size={22}
                      />
                    </View>
                  }
                >
                  <LinearGradient
                    colors={isRecording ? ['#FF0000', '#CC0000'] : ['#FF587E', '#CC4B8D']}
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
                {isRecording ? (
                  <View
                    style={{
                      minHeight: 36,
                      maxHeight: 100,
                      borderWidth: 1,
                      borderColor: '#FF587E',
                      borderRadius: borderRadius,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Text style={{ color: "#FF587E" }}>{recordTime || "00:00"}</Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#FF0000',
                        marginRight: 5
                      }} />
                      <Text style={{ color: "#FF587E" }}>{t('chat.recording')}</Text>
                    </View>
                  </View>
                ) : (
                  <RN.TextInput
                    ref={inputRef}
                    value={message}
                    onChangeText={setMessage}
                    placeholder={
                      selectedImage 
                        ? t('chat.send') 
                        : (audioPath && !message.trim() 
                            ? '' // Ne pas afficher de placeholder quand l'audio est prêt
                            : t('chat.message'))
                    }                    placeholderTextColor="#8E8E93"
                    style={{
                      minHeight: 36,
                      maxHeight: 100,
                      borderWidth: 1,
                      borderColor: audioPath ? '#FF587E33' : '#94A3B833',
                      borderRadius: borderRadius,
                      padding: 10,
                      paddingRight: 40,
                      color: "#8E8E93"
                    }}
                    multiline
                    onContentSizeChange={(event) => {
                      const height = event.nativeEvent.contentSize.height;
                      setInputHeight(height);
                      setBorderRadius(calculateBorderRadius(height));
                    }}
                  />
                )}

                {/* Afficher le lecteur audio si un enregistrement est prêt */}
                {!isRecording && audioPath && !message.trim() && (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 40,
                    bottom: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10
                  }}>
                    <TouchableOpacity
                      onPress={isPlaying ? stopPlaying : startPlaying}
                      style={{ marginRight: 10 }}
                    >
                      <FontAwesomeIcon
                        icon={isPlaying ? faPause : faPlay}
                        size={16}
                        color="#FF587E"
                      />
                    </TouchableOpacity>
                    <Text style={{ color: "#8E8E93", fontSize: 14 }}>
                      {isPlaying ? playTime : (audioLength || "00:00")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setAudioPath('')}
                      style={{ position: 'absolute', right: 10 }}
                    >
                      <FontAwesomeIcon
                        icon={faTimes}
                        size={16}
                        color="#8E8E93"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Bouton d'envoi */}
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!message.trim() && !selectedImage && !audioPath}
                  style={{
                    position: 'absolute',
                    right: 4,
                    bottom: '65%',
                    transform: [{ translateY: 18 }],
                    width: 32,
                    height: 32,
                    borderRadius: 18,
                    overflow: 'hidden'
                  }}
                >
                  <View style={{
                    width: '100%',
                    height: '100%',
                    opacity: (!message.trim() && !selectedImage && !audioPath) ? 0.5 : 1
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

      <Modal
        isOpen={isParticipantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
      >
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
                <VStack space={1} justifyContent="start">
                  <Text style={styles.h5}>
                    {t('chat.participantsList')}
                  </Text>
                  <Text color='#FF78B2' mt={1} style={styles.littleCaption}>
                    {t('chat.participants', { count: conversation?.participants?.length || 0 })}
                  </Text>
                </VStack>

                {/* Participants List */}
                <VStack space={4} paddingVertical={20}>
                  {conversation?.participants?.map((participant) => (
                    <HStack
                      key={participant._id}
                      alignItems="center"
                      space={3}
                    >
                      <Image
                        source={
                          participant.profilePicture
                            ? { uri: participant.profilePicture }
                            : require('../../assets/images/default.png')
                        }
                        alt={participant.name}
                        size={12}
                        rounded="full"
                      />
                      <VStack>
                        <Text style={styles.h5}>{participant.name}</Text>
                        {participant._id === userData?._id && (
                          <Text style={styles.littleCaption} color="#94A3B8">
                            {t('chat.you')}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </Modal.Content>
          </BlurView>
        </View>
      </Modal>

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
                <VStack space={1} justifyContent="start">
                  <Text style={styles.h5}>
                    {secretData && secretData.user
                      ? t('chat.postedBy', { name: secretData.user.name })
                      : t('chat.postedByDefault')}
                  </Text>
                  <Text color='#FF78B2' mt={1} style={styles.littleCaption}>
                    {t('chat.expiresIn')} {timeLeft}
                  </Text>
                </VStack>

                <Text paddingVertical={100} style={styles.h3}>
                  "{secretData?.content}"
                </Text>

                {/* Footer */}
                <HStack alignContent='center' alignItems='center' justifyContent='space-between' mt={4}>
                  <Text style={styles.caption}>{secretData?.label}</Text>


                  {/* Bouton de partage */}
                  <Animated.View style={{ transform: [{ scale: shareButtonScale }] }}>
                    <TouchableOpacity
                      onPress={handleShare}
                      disabled={isSharing}
                      activeOpacity={0.8}
                      style={{
                        width: '100%',
                        height: 46,
                        borderRadius: 23,
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        marginTop: 8,
                        paddingHorizontal: 20, // Padding horizontal
                        paddingVertical: 2,   // Padding vertical
                      }}
                    >
                      <LinearGradient
                        colors={shareSuccess ? ['#4CAF50', '#2E7D32'] : ['#FF587E', '#CC4B8D']}
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
                      <HStack space={3} alignItems="center">

                        <Text color='white' style={
                          styles.ctalittle
                        }>
                          {shareSuccess ? t('chat.shared') : t('chat.share')}
                        </Text>

                        <FontAwesomeIcon
                          icon={shareSuccess ? faCheck : faPaperPlane}
                          size={16}
                          color="white"
                        />
                      </HStack>
                    </TouchableOpacity>
                  </Animated.View>
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