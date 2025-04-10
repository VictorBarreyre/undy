import React from 'react';
import { Box, Text, HStack } from 'native-base';
import { useTranslation } from 'react-i18next';

const ReplyPreview = React.memo(({ replyToMessage, isUser }) => {
  if (!replyToMessage) return null;

  const { t } = useTranslation();

  const replyName = replyToMessage.senderInfo?.name || t('chat.defaultUser');
  const replyText = replyToMessage.text && replyToMessage.text.length > 30
    ? `${replyToMessage.text.substring(0, 30)}...`
    : replyToMessage.text || '';

  const hasImage = replyToMessage.image && typeof replyToMessage.image === 'string' && replyToMessage.image.length > 0;

  const bgColor = isUser ? 'rgba(255,88,126,0.08)' : 'rgba(0,0,0,0.03)';
  const textColor = isUser ? 'white' : '#2D3748';
  const nameColor = '#FF587E';

  return (
    <Box pb={1} mb={1}>
      <Box
        bg={bgColor}
        p={2}
        borderRadius={10}
        borderLeftWidth={2}
        borderLeftColor={nameColor}
        width="100%"
      >
        <HStack alignItems="center" space={1} mb={0.5}>
          <Box
            width={3}
            height={3}
            bg={nameColor}
            borderRadius={10}
            mr={1}
          />
          <Text color={nameColor} fontWeight="600" fontSize={10}>
            {replyName}
          </Text>
        </HStack>

        <HStack alignItems="center" space={1}>
          {hasImage && (
            <Box
              bg={isUser ? 'rgba(255,255,255,0.2)' : '#F0F0F0'}
              px={1.5}
              py={0.5}
              borderRadius={4}
              mb={0.5}
              alignItems="center"
              flexDirection="row"
            >
              <Text fontSize={9} color={isUser ? 'white' : '#94A3B8'}>📷</Text>
            </Box>
          )}

          {replyText && (
            <Text
              color={textColor}
              fontSize={11}
              numberOfLines={1}
              ellipsizeMode="tail"
              opacity={0.9}
            >
              {replyText}
            </Text>
          )}
        </HStack>
      </Box>
    </Box>
  );
});

export default ReplyPreview;
