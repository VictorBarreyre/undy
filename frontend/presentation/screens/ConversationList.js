import React, { useState, useEffect, useContext } from 'react';
import { FlatList, Pressable } from 'react-native';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import axios from 'axios';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { DATABASE_URL } from '@env';

const ConversationsList = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get(
          `${DATABASE_URL}/api/secrets/conversations`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        setConversations(response.data);
      } catch (error) {
        console.error('Erreur chargement conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (isLoading) {
    return (
      <Background>
        <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
          <Text>Chargement...</Text>
        </VStack>
      </Background>
    );
  }

  if (conversations.length === 0) {
    return (
      <Background>
        <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
          <Text style={styles.h3} textAlign="center" mt={4}>
            Vous n'avez pas encore déverrouillé d'Undy
          </Text>
          <Text style={styles.caption} textAlign="center" color="gray.500" mt={2}>
            Déverrouillez un undy pour commencer une conversation !
          </Text>
        </VStack>
      </Background>
    );
  }

  const renderConversation = ({ item }) => (
    <Pressable 
      onPress={() => navigation.navigate('Chat', { 
        conversationId: item._id,
        secretData: item.secret,
        conversation: item
      })}
    >
      <HStack space={3} p={4} borderBottomWidth={1} borderColor="gray.200">
        <Image
          source={{ 
            uri: item.participants[0]?.profilePicture || 'https://via.placeholder.com/40'
          }}
          alt="Profile"
          size="sm"
          rounded="full"
        />
        <VStack flex={1}>
          <Text fontWeight="bold">{item.secret?.label || 'Sans titre'}</Text>
          <Text numberOfLines={1} color="gray.500">
            {item.messages[item.messages.length - 1]?.content || 'Pas de messages'}
          </Text>
        </VStack>
        <Text color="gray.400">
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </HStack>
    </Pressable>
  );

  return (
    <Background> 
    <Box flex={1}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item._id}
      />
    </Box>
    </Background>
  );
};

export default ConversationsList;