import React, { useState, useEffect, useContext } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Box, Input, Text, FlatList, HStack, Image, VStack } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { Background } from '../../navigation/Background';
import { TouchableOpacity } from 'react-native';
import { styles } from '../../infrastructure/theme/styles';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useNavigation } from '@react-navigation/native';


const ChatScreen = ({ route }) => {
  const { conversationId, secretData, conversation } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { handleAddMessage, getConversationMessages } = useCardData();
  const { userData } = useContext(AuthContext);
  const navigation = useNavigation();


  console.log("--- PARAMÈTRES DE ROUTE ---");
  console.log("ConversationId:", conversationId);
  console.log("Secret Data:", JSON.stringify(secretData, null, 2));
  console.log("Conversation complète:", JSON.stringify(conversation, null, 2));
  console.log("Utilisateur actuel:", JSON.stringify(userData, null, 2));

  useEffect(() => {
    console.log("--- FORMATAGE DES MESSAGES ---");
    console.log("User:", userData);
    console.log("Messages de la conversation:", conversation?.messages);

    if (conversation?.messages) {
      const formattedMessages = conversation.messages.map(msg => {
        console.log("Traitement message:", {
          messageId: msg._id,
          senderId: msg.sender,
          content: msg.content
        });

        return {
          id: msg._id,
          text: msg.content,
          sender: msg.sender === userData?._id ? 'user' : 'other',
          timestamp: msg.createdAt
        };
      });

      console.log("Messages formatés:", formattedMessages);
      setMessages(formattedMessages);
    }
  }, [conversation]);

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

  const renderMessage = ({ item }) => (
    <HStack
      space={1}
      alignSelf={item.sender === 'user' ? 'flex-end' : 'flex-start'}
      m={2}
    >
      {item.sender !== 'user' && (
        <Image
          source={{
            uri: conversation.secret.user.profilePicture || 'https://via.placeholder.com/40'
          }}
          alt="Profile"
          size={8}
          rounded="full"
        />
      )}
      <VStack maxW="80%">
        {/* Ajout du nom avant le message */}
        {item.sender !== 'user' && (
          <Text 
            style={styles.littleCaption} 
            color="gray.500" 
            ml={2}
          >
            {conversation.secret.user.name}
          </Text>
        )}
        {item.sender === 'user' && (
          <Text 
            style={styles.littleCaption} 
            color="gray.500" 
            textAlign="right"
            mr={2}
          >
            {userData?.name || 'Vous'}
          </Text>
        )}
        
        <Box
          bg={item.sender === 'user' ? '#FF78B2' : '#FFFFFF'}
          p={3}
          borderRadius={20}
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
          <Text
            style={styles.littleCaption}
            color={item.sender === 'user' ? 'white' : 'gray.500'}
            textAlign={item.sender === 'user' ? 'right' : 'left'}
            mr={item.sender === 'user' ? 2 : 0}
            ml={item.sender === 'user' ? 0 : 2}
          >
            {new Date(item.timestamp).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </Box>
      </VStack>
      
      {item.sender === 'user' && (
        <Image
          source={{
            uri: userData?.profilePicture || 'https://via.placeholder.com/40'
          }}
          alt="Profile"
          size={8}
          rounded="full"
        />
      )}
    </HStack>
  );
  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <Box style={{ flex: 1 }}>
          <HStack
            alignItems="center"
            space={3}
            p={4}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <FontAwesomeIcon icon={faChevronLeft} size={20} color="#000" />
            </TouchableOpacity>

            <HStack flex={1} alignItems="center" space={5}>
              <Image
                source={{
                  uri: secretData?.user?.profilePicture || 'https://via.placeholder.com/40'
                }}
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
                  <Text style={styles.littleCaption} color="#FF78B2">
                    {secretData?.content?.substring(0, 25)}...
                  </Text>
                  <Text style={styles.littleCaption} color="#94A3B8">
                    Expire le : {new Date(conversation?.expiresAt).toLocaleDateString()}
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
