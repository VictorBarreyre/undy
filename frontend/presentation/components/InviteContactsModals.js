import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, Share, Alert } from 'react-native';
import { Box, Button, VStack, HStack, Checkbox, Divider } from 'native-base';
import { styles as globalStyles } from '../../infrastructure/theme/styles';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

const InviteContactsModal = ({ isVisible, onClose, contacts }) => {
  const { t } = useTranslation();
  console.log("Contacts reçus dans InviteContactsModal:", contacts?.slice(0, 3)); // Afficher les 3 premiers seulement
  const [selectedContacts, setSelectedContacts] = useState([]);

  const toggleContactSelection = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    } else {
      setSelectedContacts(prev => [...prev, contactId]);
    }
  };

  const sortedContacts = useMemo(() => {
    // Créer une copie pour ne pas modifier l'original
    if (!contacts || contacts.length === 0) return [];
    
    return [...contacts].sort((a, b) => {
      const nameA = (a.name || a.contactName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || '').toLowerCase();
      const nameB = (b.name || b.contactName || `${b.firstName || ''} ${b.lastName || ''}`.trim() || '').toLowerCase();
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }, [contacts]);

  const inviteContacts = async () => {
    try {
      // Récupérer les contacts sélectionnés
      const contactsToInvite = contacts.filter(
        contact => selectedContacts.includes(contact.id || contact.contactId)
      );
      
      if (contactsToInvite.length === 0) {
        return;
      }
      
      // Préparer le message d'invitation
      const message = t('inviteContacts.invitationMessage');
      
      // Partager l'invitation
      await Share.share({
        message,
        title: t('inviteContacts.invitationTitle')
      });
      
      onClose();
    } catch (error) {
      console.error(t('inviteContacts.errors.invitationError'), error);
      Alert.alert(
        t('inviteContacts.errors.title'), 
        t('inviteContacts.errors.unableToSendInvitations')
      );
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
            <Text style={globalStyles.h3}>{t('inviteContacts.title')}</Text>
            <Text style={globalStyles.caption}>
              {t('inviteContacts.noContactsUsingApp')}
            </Text>

            <FlatList
              data={sortedContacts}
              keyExtractor={item => item.id || item.contactId} // Utilise id ou contactId
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => toggleContactSelection(item.id || item.contactId)}
                  style={localStyles.contactItem}
                >
                  <HStack space={3} alignItems="center" justifyContent="space-between">
                    <Text style={globalStyles.h5}>
                      {item.name || item.contactName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Sans nom'}
                    </Text>
                    <Checkbox
                      isChecked={selectedContacts.includes(item.id || item.contactId)}
                      onChange={() => toggleContactSelection(item.id || item.contactId)}
                      value={item.id || item.contactId}
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
                <Text>{t('inviteContacts.cancel')}</Text>
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
                        {t('inviteContacts.inviteWithCount', { count: 0 })}
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
                        {t('inviteContacts.inviteWithCount', { count: selectedContacts.length })}
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