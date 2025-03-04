import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, Share, Alert } from 'react-native';
import { Box, Button, VStack, HStack, Checkbox, Divider } from 'native-base';
import { styles as globalStyles } from '../../infrastructure/theme/styles';
import LinearGradient from 'react-native-linear-gradient';

const InviteContactsModal = ({ isVisible, onClose, contacts }) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  
  const toggleContactSelection = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    } else {
      setSelectedContacts(prev => [...prev, contactId]);
    }
  };
  
  const inviteContacts = async () => {
    try {
      // Récupérer les contacts sélectionnés
      const contactsToInvite = contacts.filter(
        contact => selectedContacts.includes(contact.contactId)
      );
      
      if (contactsToInvite.length === 0) {
        return;
      }
      
      // Préparer le message d'invitation
      const message = `Hey ! Je t'invite à rejoindre Hushy, une super app pour partager des secrets ! Télécharge-la maintenant : https://hushy.app`;
      
      // Partager l'invitation
      await Share.share({
        message,
        title: 'Invitation à Hushy'
      });
      
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer les invitations');
    }
  };
  
  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Box flex={1} bg="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center">
        <Box width="90%" bg="white" borderRadius={10} p={4}>
          <VStack space={4}>
            <Text style={globalStyles.h3}>Inviter des contacts</Text>
            <Text style={globalStyles.caption}>
              Aucun de vos contacts n'utilise encore Hushy. Invitez-les à rejoindre l'application !
            </Text>
            
            <FlatList
              data={contacts}
              keyExtractor={item => item.contactId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => toggleContactSelection(item.contactId)}
                  style={localStyles.contactItem}
                >
                  <HStack space={3} alignItems="center" justifyContent="space-between">
                    <Text style={globalStyles.h5}>{item.contactName}</Text>
                    <Checkbox
                      isChecked={selectedContacts.includes(item.contactId)}
                      onChange={() => toggleContactSelection(item.contactId)}
                      value={item.contactId}
                      colorScheme="pink"
                    />
                  </HStack>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <Divider />}
              style={{ maxHeight: 300 }}
            />
            
            <HStack space={2} justifyContent="center">
              <Button variant="ghost" onPress={onClose}>
                <Text>Annuler</Text>
              </Button>
              
              <View style={localStyles.buttonContainer}>
                {selectedContacts.length === 0 ? (
                  <TouchableOpacity 
                    disabled={true} 
                    style={[localStyles.buttonWrapper, { opacity: 0.5 }]}
                  >
                    <LinearGradient
                      colors={['#FF587E', '#CC4B8D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={localStyles.gradientButton}
                    >
                      <Text style={[globalStyles.cta, { color: 'white' }]}>
                        Inviter (0)
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={inviteContacts} 
                    style={localStyles.buttonWrapper}
                  >
                    <LinearGradient
                      colors={['#FF587E', '#CC4B8D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={localStyles.gradientButton}
                    >
                      <Text style={[globalStyles.cta, { color: 'white' }]}>
                        Inviter ({selectedContacts.length})
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </Modal>
  );
};

const localStyles = StyleSheet.create({
  contactItem: {
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  buttonContainer: {
    // Pour garantir que le conteneur a la bonne taille
    minWidth: 200,
  },
  buttonWrapper: {
    // Pour garantir que le wrapper prend toute la largeur disponible
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden', // Pour s'assurer que le dégradé respecte le borderRadius
  },
  gradientButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  }
});

export default InviteContactsModal;