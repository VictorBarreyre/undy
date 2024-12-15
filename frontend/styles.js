// styles.js
import { StyleSheet } from 'react-native';
import { Platform } from 'react-native';



export const styles = StyleSheet.create({
  staticBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1, // Positionne derrière tous les autres éléments
  },
  // Style pour les conteneurs ou overlays
  container: {
    flex: 1,
    zIndex: 1, // Assure que le contenu est au-dessus du background
  },
  
safeArea: {
  paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // SafeArea pour le haut uniquement
  flex: 1,
  paddingTop: 20,
  backgroundColor: 'transparent', // Ajoutez un fond global si nécessaire
},

// Fond spécifique pour les écrans Connexion et Inscription
backgroundImage: {
  position: 'absolute',
  width: '350%',
  height: '150%',
  top: '-50%',
  left: '-25%',
  zIndex: -2, // Position pour les besoins spécifiques
},
overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // White with reduced opacity
    zIndex: -1, // Between background and content
    backdropFilter: 'blur(50px)',
},
content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
},

  h1: {
    fontSize: 36,
    lineHeight: 46,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display-Bold',
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display-Bold',
  },
  h3: {
    fontSize: 24,
    lineHeight:30,
    fontWeight: '600',
    fontFamily: 'SF-Pro-Display-Semibold',
  },
  h4: {
    fontSize: 20,
    lineHeight:22,
    fontWeight: '600',
    fontFamily: 'SF-Pro-Display-Semibold',
  },
  h5: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: 'SF-Pro-Display-Semibold',
  },
  body: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
    fontFamily: 'SF-Pro-Display-Regular',
  },
  cta: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display-Bold',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    fontFamily: 'SF-Pro-Display-Regular',
  },

  subtitleLink: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    fontFamily: 'SF-Pro-Display-Regular',
    textDecoration:'underline'
  },

  caption: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'SF-Pro-Display-Medium',
  },
  littleCaption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily: 'SF-Pro-Display-Medium',
  },
});

