import React, { useState, useEffect, useContext } from 'react';
import { Dimensions, View } from 'react-native';
import { FlatList, Pressable } from 'react-native';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import axios from 'axios';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { DATABASE_URL } from '@env';
import TypewriterLoader from '../components/TypewriterLoader';
import { useFocusEffect } from '@react-navigation/native'; // Ajoutez cet import
import { GestureHandlerRootView, Swipeable, RectButton } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';


const SCREEN_WIDTH = Dimensions.get('window').width;


const ConversationsList = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openSwipeId, setOpenSwipeId] = useState(null); // Déplacez le state ici
  const { userToken } = useContext(AuthContext);


  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${DATABASE_URL}/api/secrets/conversations`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      console.log('Toutes les conversations:', response.data);
      setConversations(response.data);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      await axios.delete(
        `${DATABASE_URL}/api/secrets/conversations/${conversationId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      // Mettre à jour la liste localement après suppression
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      // Vous pourriez ajouter une notification d'erreur ici
    }
  };


  useFocusEffect(
    React.useCallback(() => {
      fetchConversations();
    }, [userToken])
  );

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

  const renderRightActions = (conversationId) => {
    return (
      <View
        style={{
          width: 100,
          backgroundColor: '#FF0000',
          justifyContent: 'center',
          alignItems: 'center',
         
        }}
      >
        <Pressable
          onPress={() => deleteConversation(conversationId)}
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            width: '100%',
          }}
        >
          <Text color='white' style={styles.h5}>Supprimer</Text>
        </Pressable>
      </View>
    );
  };

  const renderConversation = ({ item }) => {

    let row = [];
    let prevOpenedRow;

    const closeRow = (index) => {
      if (prevOpenedRow && prevOpenedRow !== row[index]) {
        prevOpenedRow.close();
      }
      prevOpenedRow = row[index];
    };

    return (

      <GestureHandlerRootView>
        <Swipeable
            ref={(ref) => (row[item._id] = ref)}
            renderRightActions={() => renderRightActions(item._id)}
            onSwipeableOpen={() => {
              closeRow(item._id);
              setOpenSwipeId(item._id); // Utilisez le state global
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
        </Swipeable>
      </GestureHandlerRootView>
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