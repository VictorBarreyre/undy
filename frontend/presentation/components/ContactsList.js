import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { Background } from '../../navigation/Background';
import { styles as globalStyles } from '../../infrastructure/theme/styles';
import { HStack, Box, VStack, Input, Icon } from 'native-base';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const ContactsList = ({ navigation, onSelectContact }) => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { getContacts } = useContext(AuthContext);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const fetchedContacts = await getContacts();
        // Trier les contacts par prénom
        const sortedContacts = fetchedContacts.sort((a, b) => 
          a.givenName.localeCompare(b.givenName)
        );
        setContacts(sortedContacts);
        setFilteredContacts(sortedContacts);
      } catch (error) {
        console.error(t('contacts.errors.loading'), error);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = contacts.filter(contact => {
        const fullName = `${contact.givenName} ${contact.familyName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      });
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const renderContactItem = ({ item }) => (
    <TouchableOpacity 
      style={localStyles.contactItem}
      onPress={() => {
        if (onSelectContact) {
          onSelectContact(item);
        }
      }}
    >
      <HStack space={3} alignItems="center">
        <View style={localStyles.contactAvatar}>
          <Text style={localStyles.avatarText}>
            {item.givenName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <VStack>
          <Text style={globalStyles.h5}>
            {item.givenName} {item.familyName}
          </Text>
          {item.phoneNumbers.length > 0 && (
            <Text style={globalStyles.caption} color="#94A3B8">
              {item.phoneNumbers[0].number}
            </Text>
          )}
        </VStack>
      </HStack>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Background>
        <View style={localStyles.centered}>
          <Text style={globalStyles.h4}>{t('contacts.loading')}</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <Box flex={1} paddingX={5} paddingTop={5}>
        <HStack alignItems="center" justifyContent="space-between" width="100%" marginBottom={4}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <FontAwesomeIcon icon={faChevronLeft} size={20} color="#000" />
          </TouchableOpacity>

          <Text style={globalStyles.h3} width='auto' textAlign="center">
            {t('contacts.title')}
          </Text>
          
          {/* Élément vide pour équilibrer le header */}
          <View style={{ width: 20 }} />
        </HStack>

        <HStack 
          alignItems="center" 
          paddingX={4} 
          paddingY={2}
          borderRadius="full"
          backgroundColor="white"
          marginBottom={4}
        >
          <Icon 
            as={<FontAwesomeIcon icon={faSearch} />} 
            size="5" 
            color="#94A3B8" 
            marginRight={2}
          />
          <Input
            flex={1}
            placeholder={t('contacts.searchPlaceholder')}
            variant="unstyled"
            fontSize="14"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </HStack>

        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={item => item.recordID}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={localStyles.centered}>
              <Text style={globalStyles.h4}>{t('contacts.noContactsFound')}</Text>
            </View>
          }
        />
      </Box>
    </Background>
  );
};

const localStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B820',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF78B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ContactsList;