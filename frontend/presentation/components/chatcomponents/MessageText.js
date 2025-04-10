import React from 'react';
import { Text, Box } from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import { styles } from '../../../infrastructure/theme/styles';

const MessageText = React.memo(({ text, isUser }) => (
  <>
    {isUser ? (
      <LinearGradient
        colors={['#FF587E', '#CC4B8D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
    ) : (
      <Box
        bg='#FFFFFF'
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
    )}
    <Text color={isUser ? 'white' : 'black'} style={styles.caption}>
      {text}
    </Text>
  </>
));

export default MessageText;
