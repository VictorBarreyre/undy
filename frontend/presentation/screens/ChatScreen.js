// ChatScreen.js
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Box, Input, IconButton, FlatList, HStack } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

const ChatScreen = ({ route }) => {
 const [message, setMessage] = useState('');
 const [messages, setMessages] = useState([]); // À remplacer par vos données

 const sendMessage = () => {
   if (message.trim()) {
     setMessages(prev => [...prev, { id: Date.now(), text: message, sender: 'user' }]);
     setMessage('');
   }
 };

 const renderMessage = ({ item }) => (
   <Box
     bg={item.sender === 'user' ? 'blue.500' : 'gray.200'}
     p={3}
     borderRadius={12}
     maxW="80%"
     alignSelf={item.sender === 'user' ? 'flex-end' : 'flex-start'}
     m={2}
   >
     <Text color={item.sender === 'user' ? 'white' : 'black'}>{item.text}</Text>
   </Box>
 );

 return (
   <KeyboardAvoidingView
     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
     style={{ flex: 1 }}
   >
     <Box flex={1}>
       <FlatList
         data={messages}
         renderItem={renderMessage}
         keyExtractor={item => item.id.toString()}
       />
       <HStack p={4} space={2} alignItems="center">
         <Input
           flex={1}
           value={message}
           onChangeText={setMessage}
           placeholder="Message..."
           variant="filled"
         />
         <IconButton
           onPress={sendMessage}
           icon={<FontAwesomeIcon icon={faPaperPlane} />}
           borderRadius="full"
         />
       </HStack>
     </Box>
   </KeyboardAvoidingView>
 );
};

export default ChatScreen ;