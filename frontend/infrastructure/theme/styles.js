// styles.js
import { StyleSheet } from 'react-native';
import { Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window'); // Largeur de l'écran

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
  containerHome: {
    backgroundColor:'transparent',
    flex: 1,
    paddingBottom: 20,
    paddingLeft:20,
    paddingRight:20,  // Assure que le contenu est au-dessus du background
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
overlayCard: {
  position: 'absolute',
  top: 18,
  left: -50,
  width: '150%',
  height: '100%',
  zIndex: 1, // Assure que l'overlay est au-dessus
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

  ctalittle: {
    fontSize: 14,
    lineHeight: 22,
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

  buttonContainer: {
    borderRadius: 999, // Boutons arrondis
    overflow: 'hidden', // Contenir le dégradé dans le bouton
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 0,
    opacity: 1,
    // Simuler le dégradé avec une couleur de base dégradée
    backgroundImage:
      'linear-gradient(to right, rgba(249, 119, 148, 1), rgba(243, 108, 140, 1))',
  },
  buttonContent: {
    zIndex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContainer: {
    paddingLeft: width * 0.1, // Pour laisser un peu d'espace avant la première carte
  },
  cardContainer: {
    width: width * 0.75, // Largeur de la carte
    justifyContent: 'center',
    alignItems: 'center', // Contenu centré dans chaque carte
    marginRight: width * 0.05, // Espacement entre les cartes
    borderRadius: 12,
  },
  
  listContainer: {
    justifyContent: 'flex-start', // Alignement à gauche pour les cartes
    paddingLeft: 0, // Supprime le padding gauche initial
  },
});

