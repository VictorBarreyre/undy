import React from 'react';
import { FlatList, Pressable } from 'react-native';
import { Box, HStack, Text, Image, VStack } from 'native-base';
import { styles } from '../../infrastructure/theme/styles'
import { Background } from '../../navigation/Background';

const ConversationsList = ({ navigation }) => {
  const conversations = []; // À remplacer par vos données

  if (conversations.length === 0) {
    return (
      <Background>
        <VStack  flex={1} justifyContent="center" alignItems="center"  p={4}>
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
    <Pressable onPress={() => navigation.navigate('Chat', { conversationId: item.id })}>
      <HStack space={3} p={4} borderBottomWidth={1} borderColor="gray.200">
        <Image
          source={{ uri: item.profilePicture }}
          alt="Profile"
          size="sm"
          rounded="full"
        />
        <VStack flex={1}>
          <Text fontWeight="bold">{item.name}</Text>
          <Text numberOfLines={1} color="gray.500">{item.lastMessage}</Text>
        </VStack>
        <Text color="gray.400">{item.timestamp}</Text>
      </HStack>
    </Pressable>
  );

  return (
    <Box flex={1} bg="white">
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
      />
    </Box>
  );
};

export default ConversationsList