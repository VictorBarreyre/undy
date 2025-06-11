import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  ActivityIndicator,
  StyleSheet,
  Dimensions
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');
const MAX_VIDEO_WIDTH = screenWidth * 0.7;
const MAX_VIDEO_HEIGHT = 300;

const MessageVideo = React.memo(({ 
  uri, 
  onPress, 
  thumbnailUri = null,
  duration = null 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({
    width: MAX_VIDEO_WIDTH,
    height: 200
  });
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLoad = (data) => {
    setIsLoading(false);
    
    // Calculer les dimensions appropriées en gardant le ratio
    if (data.naturalSize) {
      const { width, height } = data.naturalSize;
      const aspectRatio = width / height;
      
      let finalWidth = MAX_VIDEO_WIDTH;
      let finalHeight = MAX_VIDEO_WIDTH / aspectRatio;
      
      if (finalHeight > MAX_VIDEO_HEIGHT) {
        finalHeight = MAX_VIDEO_HEIGHT;
        finalWidth = MAX_VIDEO_HEIGHT * aspectRatio;
      }
      
      setVideoDimensions({
        width: finalWidth,
        height: finalHeight
      });
    }
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, videoDimensions]}>
        <Icon name="videocam-off-outline" size={40} color="#999" />
        <Text style={styles.errorText}>Impossible de charger la vidéo</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress || handlePlayPause}
      style={styles.container}
    >
      <View style={[styles.videoContainer, videoDimensions]}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={styles.video}
          paused={!isPlaying}
          resizeMode="cover"
          onLoad={handleLoad}
          onError={handleError}
          onEnd={() => setIsPlaying(false)}
          repeat={false}
          playInBackground={false}
          playWhenInactive={false}
          posterResizeMode="cover"
          poster={thumbnailUri}
          // Pour iOS
          allowsExternalPlayback={false}
          // Pour Android
          disableFocus={true}
        />
        
        {/* Overlay de contrôle */}
        {!isPlaying && !isLoading && (
          <View style={styles.overlay}>
            <View style={styles.playButton}>
              <Icon name="play" size={30} color="#FFF" />
            </View>
          </View>
        )}
        
        {/* Indicateur de chargement */}
        {isLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}
        
        {/* Durée de la vidéo */}
        {duration && !isPlaying && !isLoading && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>
        )}
        
        {/* Indicateur de son */}
        {isPlaying && (
          <TouchableOpacity 
            style={styles.soundIndicator}
            onPress={(e) => {
              e.stopPropagation();
              // Ici vous pourriez implémenter le toggle du son
            }}
          >
            <Icon name="volume-high-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  videoContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  soundIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  errorText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
});

export default MessageVideo;