import React from 'react';
import { TouchableOpacity, Image } from 'react-native';

const MessageImage = React.memo(({ uri, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
  >
    <Image
      alt="Message image"
      source={{ uri }}
      style={{
        width: 150,
        height: 150,
      }}
      resizeMode="cover"
    />
  </TouchableOpacity>
));

export default MessageImage;
