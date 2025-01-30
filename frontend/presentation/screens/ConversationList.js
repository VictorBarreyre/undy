import React, { useState, useEffect, useContext } from 'react';
import { FlatList, Pressable } from 'react-native';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import axios from 'axios';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { DATABASE_URL } from '@env';
import TypewriterLoader from '../components/TypewriterLoader';

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
    return <TypewriterLoader />;
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
        <HStack
          alignItems='center'
          space={3}
          py={4}
          borderBottomWidth={1}
          borderColor="#94A3B820"  // Le "33" à la fin donne une opacité de 20%
        >
          <Image
            source={{
              uri: item.secret?.user?.profilePicture || 'https://via.placeholder.com/40'
            }}
            alt="Profile"
            width={45}
            height={45}
            rounded="full"
          />
          <VStack space={2} flex={1}>
            <HStack justifyContent='space-between' alignItems='center'> 
            <Text style={styles.h5} >{item.secret?.user?.name || 'Utilisateur inconnu'}</Text>
            <Text style={styles.littleCaption} color="#94A3B8">
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
            </HStack>
            <Text style={styles.littleCaption} numberOfLines={1} color="#94A3B8">{item.secret?.content || 'Sans titre'}</Text>
          </VStack>
  
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