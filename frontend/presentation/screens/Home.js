import React, { useState, useEffect, useContext } from 'react';
import { Box, VStack, Text, HStack } from 'native-base';
import SwipeDeck from '../components/SwipeDeck';
import FilterBar from '../components/Filter.bar';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../infrastructure/context/AuthContext';

const Home = ({navigation}) => {
  const { getContacts, userData } = useContext(AuthContext);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [activeType, setActiveType] = useState('Tous');
  const [userContacts, setUserContacts] = useState([]);
  const [isContactsLoaded, setIsContactsLoaded] = useState(false);

  const typeTexts = {
    Tous: "De tout le monde",
    Contacts: "De vos contacts",
    Suivis: "Des personnes que vous suivez"
  };

  // Effet pour charger les contacts quand le filtre "Contacts" est activé
  useEffect(() => {
    const loadContacts = async () => {
      if (activeType === 'Contacts' && !isContactsLoaded) {
        try {
          const contacts = await getContacts();
          if (contacts && contacts.length > 0) {
            // Extraire les numéros de téléphone et éliminer les caractères non numériques
            const phoneNumbers = contacts.flatMap(contact => 
              contact.phoneNumbers.map(phone => phone.number.replace(/\D/g, ''))
            );
            setUserContacts(phoneNumbers);
            setIsContactsLoaded(true);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des contacts:', error);
        }
      }
    };

    loadContacts();
  }, [activeType]);

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
    console.log("Filtres sélectionnés :", filters);
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    console.log("Type sélectionné :", type);
    
    // Si on passe à un type autre que "Contacts", pas besoin de charger les contacts
    if (type !== 'Contacts') {
      setIsContactsLoaded(false);
    }
  };

  return (
    <Background>
      <Box alignItems='center' alignContent='center' paddingTop={2} width="100%">
        <FilterBar onTypeChange={handleTypeChange} onFilterChange={handleFilterChange} />
      </Box>
      <VStack style={styles.containerHome} space={4}>
        <VStack paddingLeft={1} space={0}>
          <HStack alignItems='center' justifyContent='space-between'>
            <Text paddingBottom={1} style={styles.h3}>Les derniers hushys 🔥</Text>
            <FontAwesomeIcon
              icon={faEllipsis}
              size={16}
              color='black'
              style={{ marginRight: 10 }}
            />
          </HStack>
          <Text paddingBottom={2} color='#94A3B8' style={styles.caption}>{typeTexts[activeType]}</Text>
        </VStack>
        <Box flex={1} justifyContent="center" alignContent='center' alignItems="center">
          <SwipeDeck 
            selectedFilters={selectedFilters} 
            activeType={activeType} 
            userContacts={userContacts}
            style={styles.swipper} 
          />
        </Box>
      </VStack>
    </Background>
  );
};

export default Home;