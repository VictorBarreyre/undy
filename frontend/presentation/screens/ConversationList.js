import React, { useState, useEffect, useContext, useRef } from 'react';
import { Dimensions, View } from 'react-native';
import { FlatList, Pressable, Animated } from 'react-native';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { DATABASE_URL } from '@env';
import TypewriterLoader from '../components/TypewriterLoader';
import { useFocusEffect } from '@react-navigation/native'; // Ajoutez cet import
import { GestureHandlerRootView, Swipeable, RectButton } from 'react-native-gesture-handler';
import { createAxiosInstance, getAxiosInstance } from '../../data/api/axiosInstance';
import { FontAwesome5 } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ConversationsList = ({ navigation }) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openSwipeId, setOpenSwipeId] = useState(null); // Déplacez le state ici
  const { userToken } = useContext(AuthContext);
  const { unreadCountsMap, refreshUnreadCounts } = useCardData();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startAnimation = () => {
    // Reset les valeurs
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchConversations = async () => {
    const instance = getAxiosInstance();
    setIsLoading(true);
    try {
      const response = await instance.get(
        `${DATABASE_URL}/api/secrets/conversations`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setConversations(response.data);
      startAnimation(); // Démarrer l'animation après le chargement
    } catch (error) {
      console.error(t('conversations.errors.loading'), error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // Rafraîchir les compteurs de messages non lus
      refreshUnreadCounts();
      
      // Charger les conversations à chaque montage du composant
      fetchConversations();
      
    }, [userToken]) // Retirez lastUpdate de la liste des dépendances
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isLoading, conversations]);

  const deleteConversation = async (conversationId) => {
    const instance = getAxiosInstance();
    try {
      await instance.delete(
        `${DATABASE_URL}/api/secrets/conversations/${conversationId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      // Mettre à jour la liste localement après suppression
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
    } catch (error) {
      console.error(t('conversations.errors.deletion'), error);
      // Vous pourriez ajouter une notification d'erreur ici
    }
  };



  if (isLoading) {
    return (
      <Background>
        <TypewriterLoader />
      </Background>
    );
  }

  if (conversations.length === 0) {
    return (
      <Background>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
          }}
        >
          <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
            <Text style={styles.h3} textAlign="center" mt={4}>
              {t('conversations.noConversations')}
            </Text>
            <Text style={styles.caption} textAlign="center" color="#94A3B8" mt={2}>
              {t('conversations.unlockToStart')}
            </Text>
          </VStack>
        </Animated.View>
      </Background>
    );
  }

  const renderRightActions = (conversationId, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-70, 0],
      outputRange: [0, 70],
      extrapolate: 'clamp'
    });

    const opacity = dragX.interpolate({
      inputRange: [-70, -60, 0],
      outputRange: [1, 0, 0],
      extrapolate: 'clamp'
    });

    return (
      <Animated.View
        style={{
          width: 70,
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'flex-end',
          transform: [{ translateX: trans }],
          opacity: opacity
        }}
      >
        <Pressable
          onPress={() => deleteConversation(conversationId)}
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            width: '60%',
          }}
        >
          <FontAwesome5
            name="trash-alt"
            size={15}
            color="#FF78B2"
          />
        </Pressable>
      </Animated.View>
    );
  };

  const renderConversation = ({ item }) => {
    const unreadCount = unreadCountsMap[item._id] || 0;
    console.log(`Conversation ${item._id} - unreadCount:`, unreadCount);

    let row = [];
    let prevOpenedRow;

    const closeRow = (index) => {
      if (prevOpenedRow && prevOpenedRow !== row[index]) {
        prevOpenedRow.close();
      }
      prevOpenedRow = row[index];
    };

    const truncateText = (text, maxLength = 50) => {
      if (!text) return t('conversations.untitled');
      return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
    };

    return (
      <GestureHandlerRootView>
        <Swipeable
          ref={(ref) => (row[item._id] = ref)}
          renderRightActions={(_, dragX) => renderRightActions(item._id, dragX)}
          onSwipeableOpen={() => {
            closeRow(item._id);
            setOpenSwipeId(item._id);
          }}
          onSwipeableWillClose={() => setOpenSwipeId(null)}
          overshootRight={false}
        >
          <Pressable
            onPress={() => navigation.navigate('Chat', {
              conversationId: item._id,
              secretData: item.secret,
              conversation: item
            })}
          >
            <HStack
              alignItems='center'
              space={3}
              py={4}
              borderBottomWidth={1}
              borderColor="#94A3B820"
            >
              <Image
                source={
                  item.secret?.user?.profilePicture
                    ? { uri: item.secret.user.profilePicture }
                    : require('../../assets/images/default.png')
                }
                alt={t('conversations.profilePicture')}
                width={45}
                height={45}
                rounded="full"
              />
              <VStack space={2} flex={1}>
                <HStack justifyContent='space-between' alignItems='center'>
                  <Text style={styles.h5}>
                    {truncateText(item.secret?.content, 25)}
                  </Text>
                  <HStack alignItems="center" space={2}>
                    <Text style={styles.littleCaption} color="#94A3B8">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                  </HStack>
                </HStack>
                <HStack justifyContent='space-between' alignContent='center'>
                  <Text style={styles.littleCaption} color="#94A3B8">
                    {item.secret?.user?.name || t('conversations.unknownUser')}
                  </Text>
                  {unreadCount > 0 && (
                    <LinearGradient
                      colors={['#FF587E', '#CC4B8D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 6,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Text color="white" fontSize={10} fontWeight="bold">
                        {unreadCount}
                      </Text>
                    </LinearGradient>
                  )}
                </HStack>
              </VStack>
            </HStack>
          </Pressable>
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  return (
    <Background>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
        }}
      >
        <Box flex={1} justifyContent="flex-start" paddingTop={5}>
          <VStack paddingLeft={5} paddingRight={5} space={4}>
            <HStack alignItems="center" justifyContent="center" width="100%">
              {/* Texte */}
              <Text style={styles.h3} width='auto' textAlign="center">
                {t('conversations.title')}
              </Text>
            </HStack>
            <FlatList
              style={{
                paddingBottom: '20'
              }}
              data={conversations}
              renderItem={renderConversation}
              keyExtractor={item => item._id}
            />
          </VStack>
        </Box>
      </Animated.View>
    </Background>
  );
};

export default ConversationsList;