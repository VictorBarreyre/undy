import React, { useState, useEffect, useContext } from 'react';
import { VStack, Box, Text, Pressable, Image, HStack, FlatList } from 'native-base';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import { faEllipsis, faUnlock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import TypewriterLoader from '../components/TypewriterLoader';
import SecretCardBlurred from '../components/SecretCardBlurred';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ProfilTiers = ({ navigation }) => {
   const route = useRoute();
   const { userId } = route.params || {};
   const { userToken, fetchUserDataById } = useContext(AuthContext);
   const { fetchUserSecretsWithCount } = useCardData();
   const [secretCount, setSecretCount] = useState(0);
   const [userSecrets, setUserSecrets] = useState([]);
   const [userData, setUserData] = useState(null);
   const [isExpanded, setIsExpanded] = useState(false);

   useEffect(() => {
       const loadUserData = async () => {
           try {
               const data = await fetchUserDataById(userId, userToken);
               setUserData(data);
               const { secrets, count } = await fetchUserSecretsWithCount(userToken);
               setSecretCount(count);
               setUserSecrets(secrets);
           } catch (error) {
               console.error('Erreur chargement données:', error);
               navigation.goBack();
           }
       };
       if (!userData) loadUserData();
   }, [fetchUserDataById, userId, userToken, navigation, userData]);

   if (!userData) return <TypewriterLoader />;

   const truncateText = (text) => {
       const maxLength = 90;
       return text.length > maxLength ? text.slice(0, maxLength) + '... ' : text;
   };

   const content = "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard de l'imprimerie depuis les années 1500, quand un imprimeur anonyme assembla ensemble des morceaux de texte pour réaliser un livre spécimen de polices de texte. Il n'a pas fait que survivre cinq siècles, mais s'est aussi adapté à la bureautique informatique, sans que son contenu n'en soit modifié";

   return (
       <Background>
           <Box flex={1} justifyContent="flex-start" paddingTop={5}>
               <VStack paddingLeft={5} paddingRight={5} space={4}>
                   <HStack alignItems="center" justifyContent="space-between" width="100%">
                       <Pressable width={26} onPress={() => navigation.navigate('HomeTab')}>
                           <FontAwesome name="chevron-left" size={18} color="black" />
                       </Pressable>
                       <Text style={styles.h3}>Les Undy de</Text>
                       <FontAwesomeIcon icon={faEllipsis} size={16} color='black' />
                   </HStack>

                   <HStack space={4} alignItems="center" width="100%" px={2}>
                       <Image
                           src={userData?.profilePicture}
                           alt="Profile"
                           width={75}
                           height={75}
                           borderRadius="full"
                       />
                       <HStack flex={1} justifyContent="space-evenly">
                           <VStack alignItems="center">
                               <Text style={styles.h4} fontWeight="bold">{secretCount || 0}</Text>
                               <Text style={styles.caption}>Secrets</Text>
                           </VStack>
                           <VStack alignItems="center">
                               <Text style={styles.h4} fontWeight="bold">0</Text>
                               <Text style={styles.caption}>Abonnés</Text>
                           </VStack>
                           <VStack alignItems="center">
                               <Text style={styles.h4} fontWeight="bold">0</Text>
                               <Text style={styles.caption}>Abonnements</Text>
                           </VStack>
                       </HStack>
                   </HStack>

                   <VStack space={2}>
                       <Text style={styles.h4}>{userData.name}</Text>
                       <Text color='#94A3B8'>
                           {!isExpanded ? (
                               <>
                                   <Text style={styles.caption}>
                                       {truncateText(content)}
                                   </Text>
                                   <Text
                                       style={styles.caption}
                                       color="#FF78B2"
                                       onPress={() => setIsExpanded(true)}
                                   >
                                       Voir plus
                                   </Text>
                               </>
                           ) : (
                               <>
                                   {content}
                                   <Text
                                       style={styles.caption}
                                       color="#FF78B2"
                                       onPress={() => setIsExpanded(false)}
                                   >
                                       {" "}Voir moins
                                   </Text>
                               </>
                           )}
                       </Text>
                   </VStack>
               </VStack>

               <VStack flex={0.95} space={4}>
                   <Box mt={4} paddingLeft={5} paddingRight={5}>
                       <Pressable
                           style={[
                               {
                                   backgroundColor: '#000000',
                                   width: '100%',
                                   padding: 18,
                                   borderRadius: 30,
                               },
                               ({ pressed }) => ({
                                   opacity: pressed ? 0.8 : 1,
                                   transform: [{ scale: pressed ? 0.96 : 1 }],
                               })
                           ]}
                       >
                           <HStack alignItems="center" justifyContent="center" space={2}>
                               <FontAwesomeIcon icon={faUnlock} size={16} color="white" />
                               <Text color="white" fontWeight="bold">
                                   Tous ses secrets pour 9.99€/mois
                               </Text>
                           </HStack>
                       </Pressable>
                   </Box>

                   <Box flex={1} >
                       <FlatList
                           overflow='visible'
                           horizontal
                           showsHorizontalScrollIndicator={false}
                           height='100%'
                           width='100%'
                           contentContainerStyle={{ paddingHorizontal: 10 }}
                           data={userSecrets.slice().reverse()}
                           renderItem={({ item }) => (
                               <Box marginLeft={2} marginRight={4} width={SCREEN_WIDTH * 0.8}>
                                   <SecretCardBlurred secret={item} />
                               </Box>
                           )}
                           keyExtractor={(item) => item._id}
                           ListEmptyComponent={

                               <Text mt={8} width='80%' style={styles.h3} textAlign="center">
                                   {userData.name} n'a pas encore posté d'Undy
                               </Text>
                           }
                       />
                   </Box>
               </VStack>
           </Box>
       </Background>
   );
};

export default ProfilTiers;