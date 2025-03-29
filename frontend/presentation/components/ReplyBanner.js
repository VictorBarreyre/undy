import React, { memo } from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, HStack, VStack, Text } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../infrastructure/theme/styles';

/**
 * Composant qui affiche une bannière de réponse à un message
 */
const ReplyBanner = memo(({ replyToMessage, onCancelReply }) => {
  if (!replyToMessage) return null;
  
  // Extraire le contenu du message à afficher
  const messagePreview = replyToMessage.text && replyToMessage.text.length > 30 
    ? `${replyToMessage.text.substring(0, 30)}...` 
    : replyToMessage.text || '';
  
  const hasImage = replyToMessage.image && replyToMessage.image.length > 0;
  
  return (
    <Box 
      px={3} 
      pt={2} 
      pb={1} 
      bg="rgba(255,255,255,0.9)"
      borderTopWidth={1}
      borderTopColor="rgba(0,0,0,0.05)"
    >
      <HStack 
        alignItems="center" 
        justifyContent="space-between"
      >
        <HStack flex={1} space={2} alignItems="center">
          <Box 
            w={1} 
            h="100%" 
            minH={8}
            bg="#FF587E" 
            borderRadius={1}
          />
          
          <VStack flex={1}>
            <Text color="#FF587E" fontWeight="bold" fontSize="xs">
              {replyToMessage.senderInfo?.name || 'Utilisateur'}
            </Text>
            
            <HStack alignItems="center" space={1}>
              {hasImage && (
                <Box 
                  bg="#F0F0F0" 
                  px={1} 
                  py={0.5} 
                  borderRadius={4}
                >
                  <Text fontSize="2xs" color="#94A3B8">📷 Image</Text>
                </Box>
              )}
              
              <Text 
                style={styles.littleCaption} 
                numberOfLines={1} 
                ellipsizeMode="tail"
                color={hasImage && !messagePreview ? 'transparent' : '#2D3748'}
              >
                {messagePreview || (hasImage ? ' ' : 'Message')}
              </Text>
            </HStack>
          </VStack>
        </HStack>
        
        <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesomeIcon icon={faTimes} size={16} color="#94A3B8" />
        </TouchableOpacity>
      </HStack>
    </Box>
  );
});

export default ReplyBanner;