// LinkPreview.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Box, HStack, VStack } from 'native-base';
import axios from 'axios';
// Import FontAwesome
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';

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

// Fonction pour détecter la plateforme
export const detectPlatform = (url) => {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return EmbedPlatforms.TWITTER;
  } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return EmbedPlatforms.YOUTUBE;
  } else if (lowerUrl.includes('instagram.com')) {
    return EmbedPlatforms.INSTAGRAM;
  } else if (lowerUrl.includes('tiktok.com')) {
    return EmbedPlatforms.TIKTOK;
  } else if (lowerUrl.includes('facebook.com')) {
    return EmbedPlatforms.FACEBOOK;
  } else if (lowerUrl.includes('maps.apple.com')) {
    return EmbedPlatforms.APPLE_MAPS;
  } else {
    return EmbedPlatforms.WEBSITE;
  }
};

// Composant principal de prévisualisation de lien
const LinkPreview = ({ url, onPress }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const platform = detectPlatform(url);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!url) return;
      
      try {
        setLoading(true);
        // Vous devriez utiliser un service comme 'unfurl' ou une API comme 'iframely'
        // Cet exemple utilise une API fictive
        const response = await axios.get(`https://api.yourdomain.com/metadata?url=${encodeURIComponent(url)}`);
        setMetadata(response.data);
      } catch (err) {
        console.error('Erreur lors de la récupération des métadonnées:', err);
        setError(err);
        // Valeurs par défaut en cas d'erreur
        setMetadata({
          title: url,
          description: '',
          image: null,
          siteName: new URL(url).hostname
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <Box style={styles.container} bg="gray.100" rounded="md">
        <Text style={styles.loadingText}>Chargement de l'aperçu...</Text>
      </Box>
    );
  }

  if (error || !metadata) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)} style={styles.container}>
        <Text style={styles.url}>{url}</Text>
      </TouchableOpacity>
    );
  }

  // Sélectionner le rendu en fonction de la plateforme
  switch (platform) {
    case EmbedPlatforms.TWITTER:
      return <TwitterEmbed url={url} metadata={metadata} onPress={onPress} />;
    case EmbedPlatforms.YOUTUBE:
      return <YoutubeEmbed url={url} metadata={metadata} onPress={onPress} />;
    case EmbedPlatforms.INSTAGRAM:
      return <InstagramEmbed url={url} metadata={metadata} onPress={onPress} />;
    case EmbedPlatforms.FACEBOOK:
      return <FacebookEmbed url={url} metadata={metadata} onPress={onPress} />;
    case EmbedPlatforms.TIKTOK:
      return <TikTokEmbed url={url} metadata={metadata} onPress={onPress} />;
    case EmbedPlatforms.APPLE_MAPS:
      return <AppleMapsEmbed url={url} metadata={metadata} onPress={onPress} />;
    default:
      return <GenericEmbed url={url} metadata={metadata} onPress={onPress} />;
  }
};

// Composant pour Twitter
const TwitterEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={2} alignItems="center" mb={2}>
        <Box style={styles.iconContainer} bg="black">
          <FontAwesome5 name="twitter" size={12} color="white" />
        </Box>
        <Text style={styles.platformName}>
          {metadata.author || "Tweet"} sur X
        </Text>
      </HStack>
      
      {metadata.text && (
        <Text style={styles.tweetText} numberOfLines={4}>
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
      
      <Text style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
    </TouchableOpacity>
  );
};

// Composant pour YouTube
const YoutubeEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={2} alignItems="center" mb={2}>
        <Box style={styles.iconContainer} bg="#FF0000">
          <FontAwesome5 name="youtube" size={12} color="white" />
        </Box>
        <Text style={styles.platformName}>
          {metadata.author || "Vidéo"} | YouTube
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
      
      {metadata.title && (
        <Text style={styles.videoTitle} numberOfLines={2}>
          {metadata.title}
        </Text>
      )}
      
      <Text style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
    </TouchableOpacity>
  );
};

// Composant pour Instagram
const InstagramEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={2} alignItems="center" mb={2}>
        <Box style={styles.iconContainer} bg="#C13584">
          <FontAwesome5 name="instagram" size={12} color="white" />
        </Box>
        <Text style={styles.platformName}>
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
      
      {metadata.title && (
        <Text style={styles.videoTitle} numberOfLines={2}>
          {metadata.title}
        </Text>
      )}
      
      <Text style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
    </TouchableOpacity>
  );
};

// Composant pour Facebook
const FacebookEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={2} alignItems="center" mb={2}>
        <Box style={styles.iconContainer} bg="#4267B2">
          <FontAwesome5 name="facebook-f" size={12} color="white" />
        </Box>
        <Text style={styles.platformName}>
          {metadata.author || "Publication"} | Facebook
        </Text>
      </HStack>
      
      {metadata.image && (
        <Image 
          source={{ uri: metadata.image }} 
          style={styles.fbImage}
          resizeMode="cover"
        />
      )}
      
      {metadata.title && (
        <Text style={styles.videoTitle} numberOfLines={2}>
          {metadata.title}
        </Text>
      )}
      
      <Text style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
    </TouchableOpacity>
  );
};

// Composant pour TikTok
const TikTokEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={2} alignItems="center" mb={2}>
        <Box style={styles.iconContainer} bg="#000000">
          <FontAwesome5 name="tiktok" size={12} color="white" />
        </Box>
        <Text style={styles.platformName}>
          {metadata.author || "Vidéo"} | TikTok
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
      
      {metadata.title && (
        <Text style={styles.videoTitle} numberOfLines={2}>
          {metadata.title}
        </Text>
      )}
      
      <Text style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
    </TouchableOpacity>
  );
};

// Composant pour Apple Maps
const AppleMapsEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={2} alignItems="center" mb={2}>
        <Box style={styles.iconContainer} bg="#157EFB">
          <FontAwesome5 name="map-marked-alt" size={12} color="white" />
        </Box>
        <Text style={styles.platformName}>
          {metadata.title || "Lieu"} | Apple Plans
        </Text>
      </HStack>
      
      {metadata.image && (
        <Image 
          source={{ uri: metadata.image }} 
          style={styles.mapImage}
          resizeMode="cover"
        />
      )}
      
      <Text style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
    </TouchableOpacity>
  );
};

// Composant pour les sites génériques
const GenericEmbed = ({ url, metadata, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <HStack space={3} alignItems="center">
        {metadata.image ? (
          <Image 
            source={{ uri: metadata.image }} 
            style={styles.websiteImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>
              {metadata.siteName?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
        )}
        
        <VStack flex={1} space={1}>
          {metadata.title && (
            <Text style={styles.websiteTitle} numberOfLines={2}>
              {metadata.title}
            </Text>
          )}
          
          {metadata.description && (
            <Text style={styles.description} numberOfLines={2}>
              {metadata.description}
            </Text>
          )}
          
          <Text style={styles.url}>
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
  },
  loadingText: {
    color: '#999999',
    textAlign: 'center',
    padding: 10,
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
  tweetText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
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
});

export default React.memo(LinkPreview);