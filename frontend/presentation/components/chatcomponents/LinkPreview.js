// LinkPreview.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Box, HStack, VStack, Spinner } from 'native-base';
// Import FontAwesome
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
// Import du service de prévisualisation
import linkPreviewService from '../../../utils/linkPreviewService';
import LinearGradient from 'react-native-linear-gradient';


// Constantes pour les plateformes
export const EmbedPlatforms = {
  TWITTER: 'twitter',
  YOUTUBE: 'youtube',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  FACEBOOK: 'facebook',
  APPLE_MAPS: 'apple_maps',
  WEBSITE: 'website', // Pour les sites web génériques
};

// Composant principal de prévisualisation de lien
const LinkPreview = ({ url, onPress, isUser }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  let isMounted = true;
  
  const fetchMetadata = async () => {
    if (!url) return;
    
    try {
      console.log(`🔍 Récupération des métadonnées pour: ${url}`);
      setLoading(true);
      
      // Utiliser le service d'extraction directe côté client
      const data = await linkPreviewService.getLinkMetadata(url);
      
      // Log détaillé des métadonnées
      console.log(`✅ Métadonnées reçues pour: ${url}`);
      console.log(`📊 Plateforme: ${data.platform}`);
      console.log(`📝 Titre: ${data.title}`);
      console.log(`🌐 Site: ${data.siteName}`);
      console.log(`👤 Auteur: ${data.author || 'Non spécifié'}`);
      
      // Afficher des informations spécifiques selon la plateforme
      if (data.platform === 'youtube') {
        console.log(`🎬 ID Vidéo: ${data.videoId || 'Non disponible'}`);
        console.log(`🔗 URL d'embed: ${data.embedUrl || 'Non disponible'}`);
        if (data.duration) console.log(`⏱️ Durée: ${data.duration}`);
      } else if (data.platform === 'twitter') {
        console.log(`🐦 ID Tweet: ${data.tweetId || 'Non disponible'}`);
        console.log(`👥 Type: ${data.isProfile ? 'Profil' : 'Tweet'}`);
      } else if (data.platform === 'instagram') {
        console.log(`📸 ID Post: ${data.postId || 'Non disponible'}`);
        console.log(`📊 Type: ${data.contentType || 'Non spécifié'}`);
      } else if (data.platform === 'facebook') {
        console.log(`👍 ID Post: ${data.postId || 'Non disponible'}`);
        console.log(`📊 Type: ${data.contentType || 'Non spécifié'}`);
      } else if (data.platform === 'tiktok') {
        console.log(`🎵 ID Vidéo: ${data.videoId || 'Non disponible'}`);
        console.log(`📊 Type: ${data.contentType || 'Non spécifié'}`);
      } else if (data.platform === 'apple_maps') {
        console.log(`📍 Adresse: ${data.address || 'Non disponible'}`);
        if (data.coordinates) {
          console.log(`🌍 Coordonnées: ${data.coordinates.lat}, ${data.coordinates.lng}`);
        }
      }
      
      // Log complet des données
      console.log('📋 Données complètes:', JSON.stringify(data, null, 2));
      
      if (isMounted) {
        setMetadata(data);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des métadonnées:', err);
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    }
  };

  fetchMetadata();
  
  // Nettoyage
  return () => {
    isMounted = false;
  };
}, [url]);

if (loading) {
    return (
      <Box 
        style={[
          styles.container, 
          isUser && styles.userContainer
        ]} 
        bg={isUser ? 'transparent' : "gray.100"} 
        rounded="md" 
        alignItems="center" 
        justifyContent="center" 
        p={4}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <Spinner size="sm" color={isUser ? 'white' : "gray.500"} />
        <Text style={[
          styles.loadingText,
          isUser && styles.userLoadingText
        ]}>
          Chargement de l'aperçu...
        </Text>
      </Box>
    );
  }

  // Gestion des erreurs
  if (error || !metadata) {
    return (
      <TouchableOpacity
        onPress={() => Linking.openURL(url)}
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <Text style={[
          styles.url,
          isUser && styles.userUrl
        ]}>
          {url}
        </Text>
      </TouchableOpacity>
    );
  }


  // Sélectionner le rendu en fonction de la plateforme
  const platform = metadata.platform || 'website';
  
  switch (platform) {
    case 'twitter':
      return <TwitterEmbed url={url} metadata={metadata} onPress={onPress} isUser={isUser} />;
    case 'youtube':
      return <YoutubeEmbed url={url} metadata={metadata} onPress={onPress} isUser={isUser} />;
    case 'instagram':
      return <InstagramEmbed url={url} metadata={metadata} onPress={onPress} isUser={isUser} />;
    case 'facebook':
      return <FacebookEmbed url={url} metadata={metadata} onPress={onPress} isUser={isUser} />;
    case 'tiktok':
      return <TikTokEmbed url={url} metadata={metadata} onPress={onPress} isUser={isUser} />;
    case 'apple_maps':
      return <AppleMapsEmbed url={url} metadata={metadata} onPress={onPress} isUser={isUser} />;
    default:
      return <GenericEmbed url={url} metadata={metadata} onPress={onPress}  isUser={isUser}/>;
  }
};

// Composant pour Twitter
const TwitterEmbed = ({ url, metadata, onPress, isUser }) => {
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
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <HStack space={2} alignItems="center" mb={2}>
          <Box 
            style={styles.iconContainer} 
            bg="black"
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>𝕏</Text>
          </Box>
          <Text style={[
            styles.platformName,
            isUser && styles.userPlatformName
          ]}>
            {metadata.author ? `${metadata.author} sur X` : "Tweet"}
          </Text>
        </HStack>
        
        {metadata.text && (
          <Text 
            style={[
              styles.tweetText,
              isUser && styles.userTweetText
            ]} 
            numberOfLines={4}
          >
            {metadata.text}
          </Text>
        )}
        
        {metadata.image && (
          <Image 
            source={{ uri: metadata.image }} 
            style={styles.tweetImage}
            resizeMode="cover"
          />
        )}
        
        <Text style={[
          styles.url,
          isUser && styles.userUrl
        ]}>
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </TouchableOpacity>
    );
  };

// Composant pour YouTube
const YoutubeEmbed = ({ url, metadata, onPress, isUser }) => {
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
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <HStack space={3} alignItems="center" mb={2}>
          <Box 
            style={styles.iconContainer} 
            bg="#FF0000"
          >
            <FontAwesome5 name="youtube" size={12} color="white" />
          </Box>
          <VStack flex={1}>
            <Text style={[
              styles.platformName,
              isUser && styles.userPlatformName
            ]}>
              {metadata.author || "Vidéo"} | YouTube
            </Text>
            
            {metadata.viewCount && (
              <Text style={[
                styles.videoStats,
                isUser && styles.userVideoStats
              ]}>
                {metadata.viewCount}
              </Text>
            )}
          </VStack>
        </HStack>
        
        {metadata.image && (
          <View style={styles.videoContainer}>
            <Image 
              source={{ uri: metadata.image }} 
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <View style={styles.playButton}>
              <FontAwesome name="play" size={24} color="white" />
            </View>
          </View>
        )}
        
        {metadata.title && (
          <Text 
            style={[
              styles.videoTitle,
              isUser && styles.userVideoTitle
            ]} 
            numberOfLines={2}
          >
            {metadata.title}
          </Text>
        )}
        
        {metadata.publishDate && (
          <Text style={[
            styles.videoDate,
            isUser && styles.userVideoDate
          ]}>
            {metadata.publishDate}
          </Text>
        )}
        
        <HStack mt={2} space={4}>
          {metadata.likeCount && (
            <HStack space={1} alignItems="center">
              <FontAwesome name="thumbs-up" size={14} color={isUser ? "rgba(255,255,255,0.7)" : "#606060"} />
              <Text style={[styles.metricText, isUser && styles.userMetricText]}>
                {metadata.likeCount}
              </Text>
            </HStack>
          )}
        </HStack>
        
        <Text style={[
          styles.url,
          isUser && styles.userUrl
        ]}>
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Composant pour Instagram
  const InstagramEmbed = ({ url, metadata, onPress, isUser }) => {
    const handlePress = () => {
      if (onPress) {
        onPress(url);
      } else {
        Linking.openURL(url);
      }
    };
  
    // Déterminer si c'est un profil, un post ou un réel
    const isProfile = metadata.contentType === 'profile';
    const isReel = metadata.contentType === 'reel';
    
    // Obtenir l'image de profil si disponible, sinon générer un avatar par défaut
    const profileImage = metadata.authorImage || 
      (metadata.username ? `https://unavatar.io/instagram/${metadata.username}` : null);
  
    return (
      <TouchableOpacity 
        onPress={handlePress} 
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <HStack space={3} alignItems="center" mb={2}>
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Box 
              style={styles.iconContainer} 
              bg="#C13584"
            >
              <FontAwesome5 name="instagram" size={12} color="white" />
            </Box>
          )}
          <Text style={[
            styles.platformName,
            isUser && styles.userPlatformName
          ]}>
            {metadata.author || "Post"} | Instagram
          </Text>
        </HStack>
        
        {metadata.image && (
          <Image 
            source={{ uri: metadata.image }} 
            style={styles.instaImage}
            resizeMode="cover"
          />
        )}
        
        {metadata.title && metadata.title !== `Profil de ${metadata.author || 'utilisateur'}` && (
          <Text 
            style={[
              styles.videoTitle,
              isUser && styles.userVideoTitle
            ]} 
            numberOfLines={2}
          >
            {metadata.title}
          </Text>
        )}
        
        {metadata.description && (
          <Text 
            style={[
              styles.description,
              isUser && { color: 'rgba(255,255,255,0.7)' }
            ]} 
            numberOfLines={3}
          >
            {metadata.description}
          </Text>
        )}
        
        <Text style={[
          styles.url,
          isUser && styles.userUrl
        ]}>
          {isProfile ? `@${metadata.username || 'utilisateur'}` : url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Composant pour Facebook
  const FacebookEmbed = ({ url, metadata, onPress, isUser }) => {
    const handlePress = () => {
      if (onPress) {
        onPress(url);
      } else {
        Linking.openURL(url);
      }
    };
  
    // Obtenir l'image de profil si disponible, sinon générer un avatar par défaut
    const profileImage = metadata.authorImage || 
      (metadata.username ? `https://unavatar.io/facebook/${metadata.username}` : null);
  
    return (
      <TouchableOpacity 
        onPress={handlePress} 
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <HStack space={3} alignItems="center" mb={2}>
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Box 
              style={styles.iconContainer} 
              bg="#4267B2"
            >
              <FontAwesome5 name="facebook-f" size={12} color="white" />
            </Box>
          )}
          <Text style={[
            styles.platformName,
            isUser && styles.userPlatformName
          ]}>
            {metadata.author || metadata.username || "Publication"} | Facebook
          </Text>
        </HStack>
        
        {metadata.image && (
          <Image 
            source={{ uri: metadata.image }} 
            style={styles.fbImage}
            resizeMode="cover"
          />
        )}
        
        {metadata.description && (
          <Text 
            style={[
              styles.description,
              isUser && { color: 'rgba(255,255,255,0.7)' }
            ]} 
            numberOfLines={3}
          >
            {metadata.description}
          </Text>
        )}
        
        <Text style={[
          styles.url,
          isUser && styles.userUrl
        ]}>
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Composant pour TikTok
  const TikTokEmbed = ({ url, metadata, onPress, isUser }) => {
    const handlePress = () => {
      if (onPress) {
        onPress(url);
      } else {
        Linking.openURL(url);
      }
    };
  
    // Obtenir l'image de profil si disponible, sinon générer un avatar par défaut
    const profileImage = metadata.authorImage || 
      (metadata.username ? `https://unavatar.io/tiktok/${metadata.username}` : null);
  
    return (
      <TouchableOpacity 
        onPress={handlePress} 
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <HStack space={3} alignItems="center" mb={2}>
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Box 
              style={styles.iconContainer} 
              bg="#000000"
            >
              <FontAwesome5 name="tiktok" size={12} color="white" />
            </Box>
          )}
          <Text style={[
            styles.platformName,
            isUser && styles.userPlatformName
          ]}>
            {metadata.username ? `@${metadata.username}` : metadata.author || "Vidéo"} | TikTok
          </Text>
        </HStack>
        
        {metadata.image && (
          <View style={styles.videoContainer}>
            <Image 
              source={{ uri: metadata.image }} 
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <View style={styles.playButton}>
              <FontAwesome name="play" size={24} color="white" />
            </View>
          </View>
        )}
        
        {metadata.description && (
          <Text 
            style={[
              styles.description,
              isUser && { color: 'rgba(255,255,255,0.7)' }
            ]} 
            numberOfLines={3}
          >
            {metadata.description}
          </Text>
        )}
        
        <Text style={[
          styles.url,
          isUser && styles.userUrl
        ]}>
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </TouchableOpacity>
    );
  };

// Composant pour Apple Maps
// Composant pour Apple Maps
const AppleMapsEmbed = ({ url, metadata, onPress, isUser }) => {
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
      style={[
        styles.container,
        isUser && styles.userContainer
      ]}
    >
      {isUser && (
        <LinearGradient
          colors={['#FF587E', '#CC4B8D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userContainerBackground}
        />
      )}
      <HStack space={2} alignItems="center" mb={2}>
        <Box 
          style={styles.iconContainer} 
          bg="#157EFB"
        >
          <FontAwesome5 name="map-marked-alt" size={12} color="white" />
        </Box>
        <Text style={[
          styles.platformName,
          isUser && styles.userPlatformName
        ]}>
          {metadata.locationName || metadata.title || "Lieu"} | Apple Plans
        </Text>
      </HStack>
      
      {metadata.image && (
        <Image 
          source={{ uri: metadata.image }} 
          style={styles.mapImage}
          resizeMode="cover"
        />
      )}
      
      {metadata.address && (
        <Text 
          style={[
            styles.address,
            isUser && styles.userAddress
          ]} 
        >
          {metadata.address}
        </Text>
      )}
      
      <Text style={[
        styles.url,
        isUser && styles.userUrl
      ]}>
        {url.replace(/^https?:\/\/(www\.)?/, '')}
      </Text>
    </TouchableOpacity>
  );
};

  // Composant pour les sites génériques
  const GenericEmbed = ({ url, metadata, onPress, isUser }) => {
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
        style={[
          styles.container,
          isUser && styles.userContainer
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={['#FF587E', '#CC4B8D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userContainerBackground}
          />
        )}
        <HStack space={3} alignItems="center">
          {metadata.image ? (
            <Image 
              source={{ uri: metadata.image }} 
              style={styles.websiteImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text 
                style={[
                  styles.noImageText,
                  isUser && { color: 'white' }
                ]}
              >
                {metadata.siteName?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          
          <VStack flex={1} space={1}>
            {metadata.title && (
              <Text 
                style={[
                  styles.websiteTitle,
                  isUser && { color: 'white' }
                ]} 
                numberOfLines={2}
              >
                {metadata.title}
              </Text>
            )}
            
            {metadata.description && (
              <Text 
                style={[
                  styles.description,
                  isUser && { color: 'rgba(255,255,255,0.7)' }
                ]} 
                numberOfLines={2}
              >
                {metadata.description}
              </Text>
            )}
            
            <Text style={[
              styles.url,
              isUser && styles.userUrl
            ]}>
              {metadata.siteName || url.replace(/^https?:\/\/(www\.)?/, '')}
            </Text>
          </VStack>
        </HStack>
      </TouchableOpacity>
    );
  };

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginVertical: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  userContainer: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  userContainerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  loadingText: {
    color: '#999999',
    textAlign: 'center',
    padding: 10,
    marginTop: 4,
  },
  userLoadingText: {
    color: 'white',
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformName: {
    fontWeight: '600',
    color: '#666666',
    fontSize: 14,
  },
  userPlatformName: {
    color: 'white',
  },
  tweetText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  userTweetText: {
    color: 'white',
  },
  tweetImage: {
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  userVideoTitle: {
    color: 'white',
  },
  websiteImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999999',
  },
  instaImage: {
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  fbImage: {
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  mapImage: {
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  websiteTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#666666',
  },
  url: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  userUrl: {
    color: 'rgba(255,255,255,0.7)',
  }
});

export default React.memo(LinkPreview);