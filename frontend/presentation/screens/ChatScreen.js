import React, { useState, useEffect, useContext, useRef, memo, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Animated, PanResponder, Share, ActionSheetIOS, Alert, Linking, PermissionsAndroid, ActivityIndicator } from 'react-native';
import { Box, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faPlus, faTimes, faArrowUp, faChevronDown, faPaperPlane, faCheck, faMicrophone, faStop, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
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
import useContentModeration from '../../infrastructure/hook/useContentModeration';
import TypewriterSpinner from '../components/TypewriterSpinner';

const ChatScreen = ({ route }) => {
  // ====== 1. TOUS LES HOOKS D'ABORD ======
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();
  const navigation = useNavigation();
  
  // Props from navigation
  const { conversationId, secretData, conversation, showModalOnMount } = route.params;
  
  // Context hooks
  const { handleAddMessage, markConversationAsRead, uploadImage, refreshUnreadCounts, handleShareSecret, triggerConfetti } = useCardData();
  const { userData, userToken } = useContext(AuthContext);
  
  // State hooks
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
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
  const [isParticipantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isRecordingPermitted, setIsRecordingPermitted] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [messagesAwaitingModeration, setMessagesAwaitingModeration] = useState({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadState, setUnreadState] = useState({
    count: 0,
    hasScrolledToBottom: false,
    showButton: false
  });
  
  // Ref hooks
  const shareButtonScale = useRef(new Animated.Value(1)).current;
  const soundRef = useRef(null);
  const flatListRef = useRef(null);
  const isManualScrolling = useRef(false);
  const scrollPosition = useRef(0);
  const scrollSaveTimeout = useRef(null);
  const isRefreshingCountsRef = useRef(false);
  const inputRef = useRef(null);
  
  // Custom hooks
  const {
    checkText,
    checkImage,
    submitVideo,
    checkMessage,
    isChecking,
    pendingModeration
  } = useContentModeration({
    showAlerts: true,
    onViolation: (result) => {
      console.log('Contenu inapproprié détecté:', result);
    }
  });

  // ====== 2. TOUTES LES FONCTIONS ======
  
  const getConversationMessages = async (conversationId) => {
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        throw new Error('Axios non initialisé');
      }

      const response = await instance.get(`/api/secrets/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération messages:', error);
      throw error;
    }
  };

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
      return isRecordingPermitted;
    }

    return false;
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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

      const audioPath = `${AudioUtils.DocumentDirectoryPath}/recording_${Date.now()}.aac`;

      await AudioRecorder.prepareRecordingAtPath(audioPath, {
        SampleRate: 44100,
        Channels: 2,
        AudioQuality: "High",
        AudioEncoding: "aac",
        AudioEncodingBitRate: 128000,
        MeteringEnabled: true,
        IncludeBase64: false
      });

      AudioRecorder.onProgress = (data) => {
        setRecordTime(formatTime(data.currentTime * 1000));
        setRecordingDuration(data.currentTime);
      };

      AudioRecorder.onFinished = (data) => {
        setAudioPath(data.audioFileURL || audioPath);
        setAudioLength(formatTime(recordingDuration * 1000));
      };

      await AudioRecorder.startRecording();

      setIsRecording(true);
      setAudioPath(audioPath);

    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement audio.");
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      const filePath = await AudioRecorder.stopRecording();
      console.log('Enregistrement terminé à:', filePath);

      setIsRecording(false);
      setAudioPath(filePath);
      setAudioLength(formatTime(recordingDuration * 1000));

    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      setIsRecording(false);
    }
  };

  const startPlaying = () => {
    if (!audioPath) return;

    try {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }

      const sound = new Sound(audioPath, '', (error) => {
        if (error) {
          console.log('Erreur lors du chargement du son', error);
          return;
        }

        const duration = sound.getDuration();
        soundRef.current = sound;

        sound.play((success) => {
          if (success) {
            console.log('Lecture terminée avec succès');
            setIsPlaying(false);
            setPlayTime('00:00');
          } else {
            console.log('Lecture terminée avec erreur');
          }
        });

        setIsPlaying(true);

        const interval = setInterval(() => {
          if (soundRef.current) {
            soundRef.current.getCurrentTime((seconds) => {
              setPlayTime(formatTime(seconds * 1000));

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

  const stopPlaying = () => {
    try {
      if (!soundRef.current || !isPlaying) return;

      soundRef.current.stop();
      setIsPlaying(false);
      setPlayTime('00:00');

    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la lecture:', error);
      setIsPlaying(false);
    }
  };

  const uploadAudio = async (audioUri, progressCallback) => {
    try {
      const instance = getAxiosInstance();
      if (!instance) {
        throw new Error('Axios n\'est pas initialisé');
      }

      if (!audioUri) {
        throw new Error('URI audio non défini');
      }

      console.log('Upload audio base64 - URI:', audioUri);

      const fileExists = await RNFS.exists(audioUri);
      console.log('Le fichier audio existe:', fileExists);

      if (!fileExists) {
        throw new Error('Le fichier audio n\'existe pas');
      }

      const fileInfo = await RNFS.stat(audioUri);
      console.log('Informations du fichier:', {
        size: fileInfo.size,
        path: fileInfo.path,
        isFile: fileInfo.isFile()
      });

      console.log('Lecture du fichier audio en base64...');
      const base64Audio = await RNFS.readFile(audioUri, 'base64');
      console.log('Fichier audio converti en base64, longueur:', base64Audio.length);

      const audioDataUri = `data:audio/aac;base64,${base64Audio}`;

      const totalSize = audioDataUri.length;
      let uploadedSize = 0;

      const requestData = {
        audio: audioDataUri,
        duration: audioLength || "00:00"
      };

      console.log('Envoi de la requête upload audio base64...');

      const response = await instance.post('/api/upload/audio', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentCompleted}%`);
            if (progressCallback) progressCallback(percentCompleted);
          } else {
            uploadedSize = progressEvent.loaded;
            const estimatedPercent = Math.min(
              Math.round((uploadedSize / totalSize) * 100),
              99
            );
            if (progressCallback) progressCallback(estimatedPercent);
          }
        },
        timeout: 60000
      });

      console.log('Réponse upload audio:', response.data);

      try {
        await RNFS.unlink(audioUri);
        console.log('Fichier audio temporaire supprimé');
      } catch (cleanupError) {
        console.warn('Impossible de supprimer le fichier temporaire:', cleanupError);
      }

      return response.data;
    } catch (error) {
      console.error('Erreur détaillée lors de l\'upload audio:', error);

      if (error.response) {
        console.error('Réponse d\'erreur du serveur:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('Pas de réponse du serveur:', error.request);
      } else {
        console.error('Erreur de configuration:', error.message);
      }

      if (error.message.includes('413') || error.response?.status === 413) {
        Alert.alert(
          "Fichier trop volumineux",
          "L'enregistrement audio est trop long. Veuillez essayer avec un enregistrement plus court.",
          [{ text: "OK" }]
        );
      }

      throw error;
    }
  };

  const handleReplyToMessage = useCallback((message) => {
    const animateMessage = (messageId) => {
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

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

    animateMessage(message.id);
    setReplyToMessage(message);

    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [messages]);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const handleShare = async () => {
    try {
      if (!secretData) {
        console.error(t('chat.errors.missingSecretData'));
        return;
      }

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

      const secretToShare = {
        _id: secretData._id || conversation?.secret?._id,
        label: secretData?.label,
        content: secretData?.content,
        shareLink: secretData?.shareLink || `hushy://secret/${secretData?._id || conversation?.secret?._id}`
      };

      const result = await handleShareSecret(secretToShare);

      if (result && result.action === Share.sharedAction) {
        setShareSuccess(true);
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Erreur lors du partage:", error);
      Alert.alert(t('cardHome.errors.title'), t('cardHome.errors.unableToShare'));
    } finally {
      setTimeout(() => {
        setIsSharing(false);
      }, 500);
    }
  };

  const prepareImageForUpload = async (imageUri) => {
    const MAX_WIDTH = 1200;
    const MAX_HEIGHT = 1200;

    try {
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
      return imageUri;
    }
  };

  const saveScrollPosition = async (position) => {
    if (position > 0 && conversationId) {
      try {
        await AsyncStorage.setItem(`scroll_position_${conversationId}`, position.toString());
      } catch (error) {
        console.error(t('chat.errors.saveScrollPosition'), error);
      }
    }
  };

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

        const areUnreadMessagesVisible = (
          unreadState.count > 0 &&
          layoutMeasurement.height + contentOffset.y >= contentSize.height - (unreadState.count * 50)
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

  const onFlatListLayout = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => restoreScrollPosition(), 300);
    }
  }, [messages.length]);

  const safeRefreshUnreadCounts = useCallback(() => {
    if (isRefreshingCountsRef.current) return;

    isRefreshingCountsRef.current = true;

    refreshUnreadCounts().finally(() => {
      setTimeout(() => {
        isRefreshingCountsRef.current = false;
      }, 2000);
    });
  }, [refreshUnreadCounts]);

  const updateInputAreaHeight = (imageVisible) => {
    const newHeight = imageVisible ? 280 : 60;
    setInputContainerHeight(newHeight);
  };

  const sendMessage = async () => {
    try {
      if (!conversationId) {
        throw new Error(t('chat.errors.missingConversationId'));
      }

      if (!message.trim() && !selectedImage && !audioPath) return;

      if (!userData?.name) {
        throw new Error(t('chat.errors.missingUserInfo'));
      }

      let messageType = 'text';
      if (audioPath) {
        messageType = 'audio';
      } else if (selectedImage && message.trim()) {
        messageType = 'mixed';
      } else if (selectedImage) {
        messageType = 'image';
      }

      const tempId = `temp-${Date.now()}`;
      const messageText = message.trim();

      const messageToCheck = {
        id: tempId,
        content: messageText || null,
        image: selectedImage ? selectedImage.uri : null,
        audio: audioPath || null,
        messageType: messageType,
        onModerationComplete: (result) => {
          console.log('Modération terminée pour message:', result);

          if (result.status === 'flagged') {
            setMessages(prev => prev.filter(msg => msg.id !== result.messageId));

            Alert.alert(
              "Message supprimé",
              "Votre message a été supprimé car il a été identifié comme contenu inapproprié suite à une analyse complète."
            );
          }
        }
      };

      const moderationResult = await checkMessage(messageToCheck);

      if (!moderationResult.isValid) {
        console.log('Message bloqué par la modération:', moderationResult.reason);
        return;
      }

      setMessages(prev => [...prev, {
        id: tempId,
        text: messageText || undefined,
        messageType: messageType,
        image: selectedImage ? selectedImage.uri : undefined,
        audio: audioPath || undefined,
        audioDuration: audioLength || "00:00",
        sender: 'user',
        timestamp: new Date().toISOString(),
        isSending: true,
        isPendingModeration: moderationResult.status === 'pending',
        replyToMessage: replyToMessage,
        senderInfo: {
          id: userData?._id || "",
          name: userData?.name || t('chat.defaultUser')
        }
      }]);

      setMessage('');
      const imageToUpload = selectedImage;
      const audioToUpload = audioPath;
      setSelectedImage(null);
      setAudioPath('');
      setAudioLength('');
      setReplyToMessage(null);
      updateInputAreaHeight(false);

      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      });

      let messageContent = {
        senderName: userData.name,
        messageType: messageType
      };

      if (messageText && messageText.length > 0) {
        messageContent.content = messageText;
      }

      if (replyToMessage) {
        messageContent.replyTo = replyToMessage.id;
        messageContent.replyToSender = replyToMessage.senderInfo?.id;

        messageContent.replyData = {
          text: replyToMessage.text,
          sender: replyToMessage.senderInfo?.name || t('chat.defaultUser'),
          hasImage: !!replyToMessage.image,
          hasAudio: !!replyToMessage.audio
        };
      }

      if (imageToUpload) {
        setIsUploading(true);
        setUploadProgress(0);

        try {
          let imageData;
          if (imageToUpload.base64) {
            imageData = `data:${imageToUpload.type};base64,${imageToUpload.base64}`;

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

      if (audioToUpload) {
        setIsUploading(true);
        setUploadProgress(0);

        try {
          console.log('🎤 Début upload audio...');
          const audioResult = await uploadAudio(audioToUpload, (progress) => {
            setUploadProgress(progress);
            console.log('Progress:', progress + '%');
          });

          console.log('✅ Upload audio réussi:', audioResult);

          const audioMessageContent = {
            messageType: 'audio',
            audio: audioResult.url,
            audioDuration: audioResult.duration || audioLength || "00:00",
            senderName: userData.name
          };

          if (messageText && messageText.length > 0) {
            audioMessageContent.content = messageText;
          }

          const newMessage = await handleAddMessage(conversationId, audioMessageContent);

          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempId
                ? {
                  ...msg,
                  id: newMessage._id,
                  audio: audioResult.url,
                  audioDuration: audioResult.duration || audioLength,
                  isSending: false,
                  isPendingModeration: false
                }
                : msg
            )
          );

        } catch (error) {
          console.error('❌ Erreur upload audio:', error);

          let errorMessage = "Impossible d'envoyer le message audio.";
          if (error.message.includes('trop volumineux')) {
            errorMessage = "L'enregistrement est trop long. Essayez un message plus court.";
          } else if (error.message.includes('network')) {
            errorMessage = "Problème de connexion. Vérifiez votre réseau.";
          }

          Alert.alert("Erreur", errorMessage);

          setMessages(prev => prev.map(msg =>
            msg.id === tempId
              ? { ...msg, sendFailed: true, isSending: false }
              : msg
          ));

          throw error;
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }

        return;
      }

      try {
        const newMessage = await handleAddMessage(conversationId, messageContent);

        if (moderationResult.status === 'pending' && moderationResult.workflowId) {
          setMessagesAwaitingModeration(prev => ({
            ...prev,
            [tempId]: {
              realId: newMessage._id,
              workflowId: moderationResult.workflowId
            }
          }));
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId
              ? {
                ...msg,
                id: newMessage._id,
                image: messageContent.image || undefined,
                isSending: false,
                isPendingModeration: moderationResult.status === 'pending'
              }
              : msg
          )
        );
      } catch (error) {
        console.error(t('chat.errors.sendMessage'), error);

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
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert(
        "Erreur",
        "Une erreur s'est produite lors de l'envoi du message. Veuillez réessayer."
      );
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
          t('chat.documentOptions.takePhoto'),
          t('chat.documentOptions.chooseFromGallery'),
          t('chat.documentOptions.cancel')
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
              case 0:
                const cameraResult = await launchCamera(options);
                handleImageResult(cameraResult);
                break;
              case 1:
                const galleryResult = await launchImageLibrary(options);
                handleImageResult(galleryResult);
                break;
            }
          }
        );
      } else {
        const result = await launchCamera(options);
        handleImageResult(result);
      }
    } catch (error) {
      console.error(t('chat.errors.imageSelection'), error);
    }
  };

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

  const calculateBorderRadius = (height) => {
    if (height <= 40) return 18;
    if (height <= 60) return 15;
    return 10;
  };

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
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.showTimestamps === nextProps.showTimestamps &&
      prevProps.index === nextProps.index &&
      prevProps.userData?._id === nextProps.userData?._id &&
      prevProps.item.text === nextProps.item.text &&
      prevProps.item.image === nextProps.item.image &&
      prevProps.item.audio === nextProps.item.audio &&
      prevProps.item.audioDuration === nextProps.item.audioDuration &&
      prevProps.item.messageType === nextProps.item.messageType
    );
  });

  const renderMessage = useCallback(({ item, index }) => {
    return (
      <MemoizedMessageItem
        key={item.id}
        item={item}
        index={index}
        messages={messages}
        userData={userData}
        showTimestamps={showTimestamps}
        onReplyToMessage={handleReplyToMessage}
      />
    );
  }, [messages, userData, showTimestamps]);

  // ====== 3. TOUS LES useEffect ======

  // useEffect pour l'audio
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

    Sound.setCategory('Playback', true);

    if (Platform.OS === 'ios') {
      AudioRecorder.requestAuthorization().then((isAuthorized) => {
        setIsRecordingPermitted(isAuthorized);
      });
    }

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

  // useEffect pour charger les messages
  useEffect(() => {
    const loadMessagesIfNeeded = async () => {
      console.log('[ChatScreen] 🔍 Vérification du chargement des messages...');
      console.log('[ChatScreen] 📊 État actuel:', {
        hasConversationId: !!conversationId,
        hasConversation: !!conversation,
        hasMessages: !!conversation?.messages,
        messageCount: conversation?.messages?.length || 0,
        conversationFromParams: !!route.params?.conversation
      });

      if (!conversationId) {
        console.error('[ChatScreen] ❌ Pas de conversationId fourni');
        return;
      }

      if (conversation?.messages && conversation.messages.length > 0) {
        console.log('[ChatScreen] ✅ Messages déjà présents:', conversation.messages.length);
        return;
      }

      console.log('[ChatScreen] 🔄 Chargement des messages nécessaire...');
      setIsLoadingMessages(true);

      try {
        console.log('[ChatScreen] 📞 Appel getConversationMessages...');
        const messagesData = await getConversationMessages(conversationId);
        console.log('[ChatScreen] 📦 Messages récupérés:', {
          count: messagesData?.messages?.length || 0,
          conversationId: messagesData?.conversationId
        });

        let fullConversation = conversation;

        if (!fullConversation || !fullConversation.secret) {
          console.log('[ChatScreen] 🔄 Récupération des détails de la conversation...');
          try {
            const instance = getAxiosInstance();

            if (instance) {
              const response = await instance.get(`/api/secrets/conversations/${conversationId}`);
              if (response.data) {
                fullConversation = response.data;
                console.log('[ChatScreen] ✅ Conversation complète récupérée');
              }
            }
          } catch (error) {
            console.error('[ChatScreen] ⚠️ Erreur récupération conversation complète:', error);
          }
        }

        const updatedConversation = {
          ...fullConversation,
          messages: messagesData?.messages || []
        };

        console.log('[ChatScreen] 📋 Mise à jour des paramètres de navigation...');
        navigation.setParams({
          conversation: updatedConversation,
          secretData: secretData || (fullConversation?.secret ? {
            _id: fullConversation.secret._id,
            content: fullConversation.secret.content,
            label: fullConversation.secret.label,
            user: fullConversation.secret.user || fullConversation.secret.createdBy,
            shareLink: fullConversation.secret.shareLink
          } : null)
        });

        console.log('[ChatScreen] ✅ Messages chargés avec succès:', messagesData?.messages?.length || 0);

      } catch (error) {
        console.error('[ChatScreen] ❌ Erreur chargement messages:', error);
        Alert.alert(
          "Erreur",
          "Impossible de charger les messages de cette conversation. Veuillez réessayer.",
          [
            { text: "Retour", onPress: () => navigation.goBack() },
            { text: "Réessayer", onPress: () => loadMessagesIfNeeded() }
          ]
        );
      } finally {
        setIsLoadingMessages(false);
      }
    };

    const timeoutId = setTimeout(() => {
      loadMessagesIfNeeded();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [conversationId, conversation?.messages?.length, navigation]);

  useEffect(() => {
    console.log('[ChatScreen] 🔄 Paramètres de navigation mis à jour');
    console.log('[ChatScreen] 📊 Nouvelles données:', {
      conversationId: route.params?.conversationId,
      hasConversation: !!route.params?.conversation,
      hasSecretData: !!route.params?.secretData,
      messageCount: route.params?.conversation?.messages?.length || 0
    });
  }, [route.params]);

  useEffect(() => {
    if (showModalOnMount) {
      triggerConfetti(ConfettiPresets.amazing);
      setModalVisible(true);
    }
  }, [showModalOnMount]);

  useEffect(() => {
    if (!conversation || !userData) return;

    let currentUnreadCount = 0;
    let userIdStr = userData?._id?.toString() || '';

    if (typeof conversation.unreadCount === 'number') {
      currentUnreadCount = conversation.unreadCount;
    }
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

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', async () => {
      if (messages.length > 0) {
        setTimeout(() => restoreScrollPosition(), 500);
      }

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

  useEffect(() => {
    return () => {
      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current);
      }
    };
  }, []);

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
      const isCurrentUser =
        (msg.sender && typeof msg.sender === 'object' ? msg.sender._id : msg.sender) === userData._id;

      if (!lastMessageDate ||
        currentMessageDate.toDateString() !== lastMessageDate.toDateString()) {
        formattedMessages.push({
          id: `separator-${index}`,
          type: 'separator',
          timestamp: msg.createdAt,
          formattedDate: dateFormatter.formatDateOnly(msg.createdAt)
        });
      }

      const messageSenderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;

      const formattedMessage = {
        id: msg._id || `msg-${index}`,
        text: (msg.messageType === 'image' || msg.messageType === 'audio') && !msg.content?.trim()
          ? undefined
          : msg.content,
        sender: isCurrentUser ? 'user' : 'other',
        timestamp: msg.createdAt,
        formattedTime: dateFormatter.formatTimeOnly(msg.createdAt),
        formattedDate: dateFormatter.formatDate(msg.createdAt),
        messageType: msg.messageType,
        image: msg.image,
        senderInfo: {
          id: messageSenderId,
          name: userMapping[messageSenderId]?.name || msg.senderName || t('chat.defaultUser'),
          profilePicture: userMapping[messageSenderId]?.profilePicture || null
        }
      };

      if (msg.messageType === 'audio') {
        formattedMessage.audio = msg.audio;
        formattedMessage.audioDuration = msg.audioDuration || '00:00';

        console.log("Message audio formaté:", {
          id: formattedMessage.id,
          audio: formattedMessage.audio,
          audioDuration: formattedMessage.audioDuration
        });
      }

      formattedMessages.push(formattedMessage);
      lastMessageDate = currentMessageDate;
    });

    setMessages(formattedMessages);
  }, [conversation, userData?._id, t]);

  useEffect(() => {
    if (!conversation?.expiresAt) return;

    setTimeLeft(dateFormatter.formatTimeLeft(conversation.expiresAt));
    const timer = setInterval(() => {
      setTimeLeft(dateFormatter.formatTimeLeft(conversation.expiresAt));
    }, 60000);

    return () => clearInterval(timer);
  }, [conversation?.expiresAt, t]);

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
    if (unreadState.count === 0 && unreadState.hasScrolledToBottom) {
      timer = setTimeout(() => {
        safeRefreshUnreadCounts();
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [unreadState.count, unreadState.hasScrolledToBottom]);

  // ====== 4. RETURNS CONDITIONNELS ======
  
  if (isLoadingMessages) {
     return <TypewriterSpinner text="hushy..." />;
  }

  // ====== 5. RETURN PRINCIPAL ======
  
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

          {/* Zone d'input avec hauteur fixe */}
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
                  overflow: 'hidden',
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

              {/* Zone de saisie/enregistrement/audio */}
              <Box
                flex={1}
                borderWidth={1}
                borderColor={isRecording ? '#FF587E' : (audioPath ? '#FF587E33' : '#94A3B833')}
                borderRadius={18}
                height={46}
                overflow="hidden"
                position="relative"
              >
                {/* État d'enregistrement */}
                {isRecording ? (
                  <View
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                    </View>
                  </View>
                ) : (
                  <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {/* Input texte */}
                    <RN.TextInput
                      ref={inputRef}
                      value={message}
                      onChangeText={setMessage}
                      placeholder={selectedImage ? t('chat.send') : (audioPath ? '' : t('chat.message'))}
                      placeholderTextColor="#8E8E93"
                      style={{
                        width: '100%',
                        height: '100%',
                        padding: 10,
                        paddingRight: 40,
                        color: "#8E8E93",
                        opacity: (!isRecording && audioPath && !message.trim()) ? 0 : 1
                      }}
                    />

                    {/* Lecteur audio */}
                    {!isRecording && audioPath && !message.trim() && (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 10,
                        backgroundColor: 'white',
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
                          style={{
                            position: 'absolute',
                            right: 40,
                            top: '50%',
                            transform: [{ translateY: -8 }]
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faTimes}
                            size={16}
                            color="#8E8E93"
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Bouton d'envoi */}
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!message.trim() && !selectedImage && !audioPath}
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: [{ translateY: -14 }],
                    width: 28,
                    height: 28,
                    borderRadius: 14,
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
                      <FontAwesomeIcon icon={faArrowUp} size={14} color="white" />
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

      {/* Modal participants */}
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
                        paddingHorizontal: 20,
                        paddingVertical: 2,
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
                        <Text color='white' style={styles.ctalittle}>
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