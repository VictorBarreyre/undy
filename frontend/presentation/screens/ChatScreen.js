// ChatScreen.js
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Box, Input, Text, FlatList, HStack } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Background } from '../../navigation/Background';
import { TouchableOpacity } from 'react-native';
import { styles } from '../../infrastructure/theme/styles'
import { useCardData } from '../../infrastructure/context/CardDataContexte';


const ChatScreen = ({ route }) => {
  const { conversationId } = route.params; // Récupérez le conversationId des params
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage } = useCardData();

  console.log("ConversationId reçu:", conversationId); // Pour debug

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      if (!conversationId) {
        throw new Error('ID de conversation manquant');
      }
      const newMessage = await handleAddMessage(conversationId, message);
      setMessage('');
      // Mettre à jour les messages localement
      setMessages(prev => [...prev, { 
        id: Date.now(), // ID temporaire
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
      bg={item.sender === 'user' ? '#FF78B2' : '#FFFFFF'} // Couleurs iMessage
      p={3}
      borderRadius={20}  // Coins plus arrondis
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
          <Box style={{ flex: 1, marginBottom: 60 }}> {/* Espace pour l'input */}
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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 0} // Changé de 90 à 0
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