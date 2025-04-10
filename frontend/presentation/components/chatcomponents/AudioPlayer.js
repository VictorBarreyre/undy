import React from 'react';
import { View, Text } from 'react-native';

const AudioPlayer = ({ uri, duration = "00:00", isUser }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text>Audio Player Test</Text>
    </View>
  );
};

export default AudioPlayer;