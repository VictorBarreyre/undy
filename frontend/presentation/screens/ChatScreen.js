import React, { useState, useEffect, useContext, useRef } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Pressable } from 'react-native';
import { Box, Input, Text, FlatList, HStack, Image, VStack, View, Modal } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { Background } from '../../navigation/Background';
import { TouchableOpacity } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';




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
  }, [conversationId, markConversationAsRead]);


  useEffect(() => {
    // Ne montrer la modale que lors du montage initial si showModalOnMount est true
    if (isInitialMount.current && showModalOnMount) {
      setModalVisible(true);
      isInitialMount.current = false;
    }
  }, [showModalOnMount]);


  useEffect(() => {
    if (conversation?.messages) {
      const formattedMessages = [];
      let lastMessageDate = null;

      conversation.messages.forEach((msg, index) => {
        const currentMessageDate = new Date(msg.createdAt);

        // Ajouter un séparateur si la date change
        if (!lastMessageDate ||
          currentMessageDate.toDateString() !== lastMessageDate.toDateString()) {
          formattedMessages.push({
            id: `separator-${index}`,
            type: 'separator',
            timestamp: msg.createdAt,
            shouldShowDateSeparator: true
          });
        }

        // Ajouter le message
        formattedMessages.push({
          id: msg._id,
          text: msg.content,
          sender: msg.sender === userData?._id ? 'user' : 'other',
          timestamp: msg.createdAt
        });

        lastMessageDate = currentMessageDate;
      });

      setMessages(formattedMessages);
    }
  }, [conversation]);

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

  // Pour les nouveaux messages, garder 'user' tel quel
  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      if (!conversationId) {
        throw new Error('ID de conversation manquant');
      }
      const newMessage = await handleAddMessage(conversationId, message);
      setMessage('');

      // Ajout du nouveau message avec le bon ID d'expéditeur
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: message,
        sender: 'user', // Force le message à être de l'utilisateur actuel
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    }
  };

  const renderMessage = ({ item }) => {
    if (item.type === 'separator') {
      return (
        <Text
          textAlign="center"
          color="gray.500"
          my={2}
        >
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
                conversation.secret.user.profilePicture
                  ? { uri: conversation.secret.user.profilePicture }
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
                color="gray.500"
                ml={2}
              >
                {conversation.messages.find(msg => msg._id === item.id)?.sender?.name || 'Utilisateur'}
              </Text>
            )}

            <Pressable
              onPress={() => setIsTimestampVisible(!isTimestampVisible)}
            >
              <Box
                p={3}
                borderRadius={20}
                style={{
                  marginVertical: 4,
                  marginHorizontal: 8,
                  overflow: 'hidden', // Important for gradient to clip correctly
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
          <Box style={{ flex: 1, marginBottom: 60 }}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{
                flexGrow: 1,
                marginTop: 20
              }}
            />
          </Box>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 0}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <HStack
              space={2}
              alignItems="center"
              style={{
                paddingHorizontal: 15,
                paddingVertical: 10,
              }}
            >
              <Input
                flex={1}
                value={message}
                onChangeText={setMessage}
                placeholder="Message..."
                borderRadius="full"
                backgroundColor="white"
                height="40px"
                paddingX={4}
                fontSize="16px"
                style={{
                  borderWidth: 0
                }}
              />
              <TouchableOpacity
                onPress={sendMessage}
                style={{
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <MaskedView
                  maskElement={
                    <View style={{ backgroundColor: 'transparent' }}>
                      <FontAwesomeIcon
                        icon={faPaperPlane}
                        color="black"
                        size={20}
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
                      alignContent: 'center'
                    }}
                  />
                </MaskedView>
              </TouchableOpacity>
            </HStack>
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
                <HStack space={2} justifyContent="center">
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
