import React, { useState, useContext, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { VStack, Box, Text, Pressable, Image, HStack, FlatList } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import SecretCard from '../components/SecretCard';
import TypewriterLoader from '../components/TypewriterLoader';


const SCREEN_WIDTH = Dimensions.get('window').width;


export default function Profile({ navigation }) {
    const { userData, userToken } = useContext(AuthContext);
    const { fetchUserSecretsWithCount } = useCardData();
    const [secretCount, setSecretCount] = useState(0);
    const [userSecrets, setUserSecrets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState(null);
    const defaultProfilePicture = require('../../assets/images/default.png'); // Add this at the top with other imports


    const tabs = [
        {
            title: 'Vos undy',
            content: isLoading ? (
                <Text>Chargement...</Text>
            ) : (
                <Box flex={1} width="100%" height="100%">
                    <FlatList
                        overflow='visible'
                        horizontal={true}  // Scroll horizontal
                        showsHorizontalScrollIndicator={false}
                        height='100%'
                        width='100%'
                        contentContainerStyle={{ paddingHorizontal: 10, flexGrow: 1 }}
                        data={userSecrets.slice().reverse()}
                        renderItem={({ item }) => (
                            <Box marginLeft={2} marginRight={4} width={SCREEN_WIDTH * 0.8}>
                                <SecretCard secret={item} />
                            </Box>
                        )}
                        keyExtractor={item => item._id}
                        ListEmptyComponent={
                            <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
                                <Text style={styles.h4} textAlign="center" mt={4}>
                                    Wow mais c'est désert ici
                                </Text>
                            </VStack>
                        }
                    />
                </Box>
            )
        },
        {
            title: <Text color='#94A3B8' style={styles.h5}>Ceux des autres</Text>,
            content:

                <Text style={styles.h4} textAlign="center" mt={20}>
                    Wow mais c'est désert ici
                </Text>

        }
    ];

    const truncateText = (text) => {
        const maxLength = 90; // Ajustez selon vos besoins
        return text.length > maxLength
            ? text.slice(0, maxLength) + '... '
            : text;
    };

    const content = "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard de l'imprimerie depuis les années 1500, quand un imprimeur anonyme assembla ensemble des morceaux de texte pour réaliser un livre spécimen de polices de texte. Il n'a pas fait que survivre cinq siècles, mais s'est aussi adapté à la bureautique informatique, sans que son contenu n'en soit modifié"

    useEffect(() => {
        const loadUserData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                if (!userToken) {
                    return; // Sortir si pas de token
                }

                const { secrets, count } = await fetchUserSecretsWithCount(userToken);
                setUserSecrets(secrets);
                setSecretCount(count);

            } catch (error) {
                console.error('Erreur chargement données:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (userToken) {  // Ajouter cette condition
            loadUserData();
        }
    }, [userToken]);

    if (isLoading) {
        return <TypewriterLoader />;
    }

    return (
        <Background>
            <Box flex={1} justifyContent="flex-start" paddingTop={5}>
                <VStack paddingLeft={5} paddingRight={5} space={4}>
                    <HStack alignItems="center" justifyContent="space-between" width="100%">
                        {/* Icône Back */}
                        <Pressable width={26} onPress={() => navigation.navigate('HomeTab')}>
                            <FontAwesome name="chevron-left" size={18} color="black" />
                        </Pressable>

                        {/* Texte */}
                        <Text style={styles.h3} width='auto' textAlign="center">
                            Mon Profil
                        </Text>

                        {/* Icône Settings */}
                        <Pressable onPress={() => navigation.navigate('ProfilSettings')}>
                            <FontAwesome5 name="cog" size={26} color="black" solid={false} />
                        </Pressable>
                    </HStack>

                    <HStack space={4} alignItems="center" width="100%" px={2}>
                        <Image
                            src={userData?.profilePicture || defaultProfilePicture}
                            alt={`${userData?.name || 'User'}'s profile`}
                            width={75}
                            height={75}
                            borderRadius={50}
                        />
                        <HStack flex={1} justifyContent="space-evenly" alignItems="center">
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black">
                                    {secretCount || 0}
                                </Text>
                                <Text style={styles.caption}>Secrets</Text>
                            </VStack>
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black">0</Text>
                                <Text style={styles.caption}>Abonnés</Text>
                            </VStack>
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black">0</Text>
                                <Text style={styles.caption}>Abonnements</Text>
                            </VStack>
                        </HStack>
                    </HStack>

                    <VStack space={2}>
                        <Text style={styles.h4}>{userData.name} </Text>
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

                <VStack flex={0.8} space={4}>
                    <HStack
                        mt={6}
                        paddingLeft={5} paddingRight={5}
                        justifyContent="space-around">
                        {tabs.map((tab, index) => (
                            <Pressable
                                alignContent='center'
                                alignItems='center'
                                width='50%'
                                key={index}
                                onPress={() => setActiveTab(index)}
                                borderBottomWidth={activeTab === index ? 3 : 1}
                                borderBottomColor={activeTab === index ? "#FF78B2" : "#94A3B8"}
                                paddingBottom={2}
                                opacity={activeTab === index ? 100 : 40}
                                zIndex={activeTab === index ? 1 : 0}
                            >
                                <Text style={styles.h5}>{tab.title}</Text>
                            </Pressable>
                        ))}
                    </HStack>

                    <Box height='auto' mt={2}>
                        <Text>{tabs[activeTab].content}</Text>
                    </Box>
                </VStack>


            </Box>
        </Background >
    );
};


