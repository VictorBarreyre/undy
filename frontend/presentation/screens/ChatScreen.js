import React, { useState, useEffect, useContext } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Box, Input, Text, FlatList, HStack } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Background } from '../../navigation/Background';
import { TouchableOpacity } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';

const ChatScreen = ({ route }) => {
  const { conversationId } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, getConversationMessages } = useCardData();
  const { user } = useContext(AuthContext);

  console.log("ConversationId reçu:", conversationId);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        console.log("Chargement des messages pour la conversation:", conversationId);
        const conversationData = await getConversationMessages(conversationId);
        console.log("Conversation data:", conversationData);

        if (conversationData.messages) {
          const formattedMessages = conversationData.messages.map(msg => ({
            id: msg._id,
            text: msg.content,
            sender: msg.sender?._id === user?._id ? 'user' : 'other',
            timestamp: msg.createdAt
          }));

          console.log("Formatted messages:", formattedMessages);
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
      }
    };

    if (user) {
      loadMessages();
    }
  }, [conversationId, user]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      if (!conversationId) {
        throw new Error('ID de conversation manquant');
      }
      const newMessage = await handleAddMessage(conversationId, message);
      setMessage('');
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: message,
        sender: 'user',
        ...newMessage
      }]);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    }
  };

  const renderMessage = ({ item }) => (
    <Box
      bg={item.sender === 'user' ? '#FF78B2' : '#FFFFFF'}
      p={3}
      borderRadius={20}
      maxW="80%"
      alignSelf={item.sender === 'user' ? 'flex-end' : 'flex-start'}
      m={2}
      style={{
        marginVertical: 4,
        marginHorizontal: 8,
      }}
    >
      <Text
        color={item.sender === 'user' ? 'white' : 'black'}
        style={styles.caption}
      >
        {item.text}
      </Text>
    </Box>
  );

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <Box style={{ flex: 1 }}>
          <Box style={{ flex: 1, marginBottom: 60 }}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{
                flexGrow: 1,
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
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  color="#FF78B2"
                  size={20}
                />
              </TouchableOpacity>
            </HStack>
          </KeyboardAvoidingView>
        </Box>
      </SafeAreaView>
    </Background>
  );
};

export default ChatScreen;
