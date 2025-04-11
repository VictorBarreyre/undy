import React from 'react';
import {
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  View
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

/**
 * Composant simple pour afficher un lien cliquable
 * @param {Object} props - Propriétés du composant
 * @param {string} props.url - URL à afficher
 * @param {boolean} props.isUser - Si le lien est affiché dans un message de l'utilisateur
 * @param {Function} props.onPress - Fonction à appeler lors du clic (facultatif)
 * @returns {JSX.Element} - Composant de lien
 */
const LinkPreview = ({ url, isUser = false, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  // Obtenir le nom de domaine
  let displayUrl = url;
  try {
    const urlObj = new URL(url);
    displayUrl = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch (e) {
    // Conserver l'URL telle quelle si elle n'est pas valide
  }

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={[styles.container, isUser && styles.userContainer]}
    >
      <FontAwesome5 name="link" size={14} color={isUser ? "#fff" : "#555"} />
      <Text 
        style={[styles.linkText, isUser && styles.userLinkText]}
        numberOfLines={1}
      >
        {displayUrl}
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
  },
  userContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  linkText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1E88E5',
    flex: 1,
    fontWeight: '500',
  },
  userLinkText: {
    color: '#4FC3F7',
  },
});

export default LinkPreview;