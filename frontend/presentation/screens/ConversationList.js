import React, { useState, useEffect, useContext } from 'react';
import { FlatList, Pressable } from 'react-native';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import axios from 'axios';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { DATABASE_URL } from '@env';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';

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
        console.log('Toutes les conversations:', response.data);
        response.data.forEach((conversation, index) => {
          console.log(`Conversation ${index + 1}:`, {
            conversationId: conversation._id,
            secret: conversation.secret,
            participants: conversation.participants,
            messages: conversation.messages,
            updatedAt: conversation.updatedAt
          });
        });
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

  const renderConversation = ({ item }) => {
    console.log('Données complètes de la conversation:', {
      conversationId: item._id,
      secret: item.secret,
      secretAuthor: item.secret?.user,
      participants: item.participants
    });

    return (
      <Pressable
        onPress={() => navigation.navigate('Chat', {
          conversationId: item._id,
          secretData: item.secret,
          conversation: item
        })}
      >
        <HStack alignItems='center' space={3} py={4} borderBottomWidth={1} borderColor="gray.200">
          <Image
            source={{
              uri: item.secret?.user?.profilePicture || 'https://via.placeholder.com/40'
            }}
            alt="Profile"
            width={45}
            height={45}
            rounded="full"
          />
          <VStack flex={1}>
            <Text fontWeight="bold">{item.secret?.user?.name || 'Utilisateur inconnu'}</Text>
            <Text fontSize="xs" color="gray.500">{item.secret?.label || 'Sans titre'}</Text>
          </VStack>
          <Text color="gray.400">
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </HStack>
      </Pressable>
    );
  };

  return (
    <Background>
      <Box flex={1} justifyContent="flex-start" paddingTop={5}>
        <VStack paddingLeft={5} paddingRight={5} space={4}>
          <HStack alignItems="center" justifyContent="center" width="100%">
        
            {/* Texte */}
            <Text style={styles.h3} width='auto' textAlign="center">
              Conversations
            </Text>

      
          </HStack>
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={item => item._id}
          />
        </VStack>
      </Box>
    </Background>
  );
};

export default ConversationsList;