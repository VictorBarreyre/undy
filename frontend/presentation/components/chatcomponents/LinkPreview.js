import React from 'react';
import { Text, TouchableOpacity, Linking, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';

const LinkPreview = ({ url, isUser = false, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, isUser && styles.userContainer]}
    >
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
            borderRadius: 8,
          }}
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
          }}
        />
      )}
      <FontAwesome5 marginRight={8} name="link" size={14} color={isUser ? "#fff" : "#555"} />
      <Text
        style={[
         
          styles.caption,
          { color: isUser ? 'white' : 'black', } // Appliquer la couleur ici
        ]}
      >
        {url}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  userContainer: {
    backgroundColor: 'transparent', // Utiliser le dégradé pour les utilisateurs
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'SF-Pro-Display-Medium',
  },
});

export default LinkPreview;
