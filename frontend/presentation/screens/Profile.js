import React, { useState, useContext, useEffect, useRef } from 'react';
import { Dimensions, Alert, Animated } from 'react-native';
import { VStack, Box, Text, Pressable, Image, HStack, FlatList, Spinner } from 'native-base';
import { AuthContext } from '../../infrastructure/context/AuthContext';
import { useCardData } from '../../infrastructure/context/CardDataContexte';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { styles } from '../../infrastructure/theme/styles';
import { Background } from '../../navigation/Background';
import SecretCard from '../components/SecretCard';
import TypewriterLoader from '../components/TypewriterLoader';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Profile({ navigation }) {
    const { t } = useTranslation();
    const { userData, setUserData, userToken, handleProfileImageUpdate, getImageSource } = useContext(AuthContext);
    const { fetchUserSecretsWithCount, fetchPurchasedSecrets } = useCardData();
    const [secretCount, setSecretCount] = useState(0);
    const [userSecrets, setUserSecrets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState(null);
    const defaultProfilePicture = require('../../assets/images/default.png');
    const [purchasedSecrets, setPurchasedSecrets] = useState([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const photoUpdateAnim = useRef(new Animated.Value(1)).current;

    const startAnimation = () => {
        // Reset la valeur
        fadeAnim.setValue(0);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    };

    useEffect(() => {
        const loadUserData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Plus besoin de vérifier userToken car géré par l'intercepteur
                const { secrets, count } = await fetchUserSecretsWithCount();
                const purchasedSecretsData = await fetchPurchasedSecrets();

                setUserSecrets(secrets);
                setSecretCount(count);
                setPurchasedSecrets(purchasedSecretsData);
                startAnimation(); // Démarrer l'animation après le chargement

            } catch (error) {
                console.error(t('profile.errors.loadingData'), error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        // Plus besoin de vérifier userToken ici
        loadUserData();
    }, []);

    const tabs = [
        {
            title: t('profile.tabs.yourSecrets'),
            content: isLoading ? (
                <Text>{t('profile.loading')}</Text>
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
                                    {t('profile.emptyList')}
                                </Text>
                            </VStack>
                        }
                    />
                </Box>
            )
        },
        {
            title: t('profile.tabs.othersSecrets'),
            content: isLoading ? (
                <Text>{t('profile.loading')}</Text>
            ) : (
                <Box flex={1} width="100%" height="100%">
                    <FlatList
                        overflow='visible'
                        horizontal={true}  // Scroll horizontal
                        showsHorizontalScrollIndicator={false}
                        height='100%'
                        width='100%'
                        contentContainerStyle={{ paddingHorizontal: 10, flexGrow: 1 }}
                        data={purchasedSecrets}
                        renderItem={({ item }) => (
                            <Box marginLeft={2} marginRight={4} width={SCREEN_WIDTH * 0.8}>
                                <SecretCard secret={item} isPurchased={true} />
                            </Box>
                        )}
                        keyExtractor={item => item._id}
                        ListEmptyComponent={
                            <VStack flex={1} justifyContent="center" alignItems="center" p={4}>
                                <Text style={styles.h4} textAlign="center" mt={4}>
                                    {t('profile.emptyList')}
                                </Text>
                            </VStack>
                        }
                    />
                </Box>
            )
        }
    ];

    const truncateText = (text) => {
        const maxLength = 90; // Ajustez selon vos besoins
        return text.length > maxLength
            ? text.slice(0, maxLength) + '... '
            : text;
    };

    const animateProfilePhoto = () => {
        // Séquence d'animation: rétrécir puis grandir
        Animated.sequence([
          Animated.timing(photoUpdateAnim, {
            toValue: 0.92,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(photoUpdateAnim, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(photoUpdateAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      };

    const handleImageSelection = async () => {
        try {
          setIsUploadingImage(true);
          
          const result = await launchImageLibrary({
            mediaType: 'photo',
            maxWidth: 800,  // Limiter la taille pour optimiser l'upload
            maxHeight: 800,
            quality: 0.8,   // Réduire légèrement la qualité
            includeBase64: true,
          });
          
          if (result.didCancel) {
            console.log(t('profile.imagePicker.canceled'));
            return;
          }
          
          if (!result.assets || !result.assets[0]) {
            throw new Error(t('profile.imagePicker.noImageSelected'));
          }
          
          const imageAsset = result.assets[0];
          
          // Uploader et mettre à jour le profil
          const updatedUser = await handleProfileImageUpdate(imageAsset);
          
          if (updatedUser?.profilePicture) {
            // Animer pour indiquer le succès
            animateProfilePhoto();
          }
        } catch (error) {
          console.error(t('profile.errors.fullError'), error);
          Alert.alert(
            t('profile.errors.title'),
            error.message || t('profile.errors.unableToChangeProfilePicture')
          );
        } finally {
          setIsUploadingImage(false);
        }
      };

    const content = t('profile.dummyText');

    if (isLoading) {
        return <TypewriterLoader />;
    }

    return (
        <Background>
             <Animated.View 
                style={{ 
                    flex: 1,
                    opacity: fadeAnim,
                }}
            >
            <Box flex={1} justifyContent="flex-start" paddingTop={5}>
                <VStack paddingLeft={5} paddingRight={5} space={4}>
                    <HStack alignItems="center" justifyContent="space-between" width="100%">
                        {/* Icône Back */}
                        <Pressable width={26} onPress={() => navigation.navigate('HomeTab')}>
                            <FontAwesome name="chevron-left" size={18} color="black" />
                        </Pressable>

                        {/* Texte */}
                        <Text style={styles.h3} width='auto' textAlign="center">
                            {t('profile.title')}
                        </Text>

                        {/* Icône Settings */}
                        <Pressable onPress={() => navigation.navigate('ProfilSettings')}>
                            <FontAwesome5 name="cog" size={26} color="black" solid={false} />
                        </Pressable>
                    </HStack>

                    <HStack space={4} alignItems="center" width="100%" px={2}>
                        <Pressable onPress={handleImageSelection}>
                            <Box position="relative">
                                <Image
                                    source={{
                                        uri: userData?.profilePicture
                                    }}
                                    alt={t('profile.profilePictureAlt', { name: userData?.name || t('profile.defaultName') })}
                                    width={75}
                                    height={75}
                                    borderRadius={50}
                                    fallbackSource={defaultProfilePicture}
                                />
                                {isUploadingImage && (
                                    <Box
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        right={0}
                                        bottom={0}
                                        bg="rgba(0,0,0,0.5)"
                                        borderRadius={50}
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Spinner color="white" />
                                    </Box>
                                )}
                                <Box
                                    position="absolute"
                                    bottom={0}
                                    right={0}
                                    bg="black"
                                    borderRadius={50}
                                    p={1}
                                >
                                    <FontAwesome5 name="camera" size={12} color="white" />
                                </Box>
                            </Box>
                        </Pressable>
                        <HStack flex={1} justifyContent="space-evenly" alignItems="center">
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black">
                                    {secretCount || 0}
                                </Text>
                                <Text style={styles.caption}>{t('profile.stats.secrets')}</Text>
                            </VStack>
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black">0</Text>
                                <Text style={styles.caption}>{t('profile.stats.followers')}</Text>
                            </VStack>
                            <VStack alignItems="center">
                                <Text style={styles.h4} fontWeight="bold" color="black">0</Text>
                                <Text style={styles.caption}>{t('profile.stats.following')}</Text>
                            </VStack>
                        </HStack>
                    </HStack>

                    <VStack space={2}>
                        <Text style={styles.h4}>{userData?.name} </Text>
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
                                        {t('profile.seeMore')}
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
                                        {" "}{t('profile.seeLess')}
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
                                <Text color={activeTab === index ? 'black' : "#94A3B8"} style={styles.h5}>{tab.title}</Text>
                            </Pressable>
                        ))}
                    </HStack>

                    <Box height='auto' mt={2}>
                        <Text>{tabs[activeTab].content}</Text>
                    </Box>
                </VStack>
            </Box>
            </Animated.View>
        </Background>
    );
};