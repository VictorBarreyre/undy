// styles.js
import { StyleSheet } from 'react-native';
import { Platform, Dimensions, StatusBar } from 'react-native';

const { width } = Dimensions.get('window'); // Largeur de l'écran

// Styles précalculés pour éviter de les recréer à chaque rendu
export const bubbleStyles = {
  user: {
    first: {
      borderRadius: 20,
      borderBottomRightRadius: 3,
      marginBottom: 1,
      overflow: 'hidden'
    },
    middle: {
      borderRadius: 20,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      marginVertical: 1,
      overflow: 'hidden'
    },
    last: {
      borderRadius: 20,
      borderTopRightRadius: 3,
      marginTop: 1,
      overflow: 'hidden'
    },
    single: {
      borderRadius: 20,
      overflow: 'hidden'
    }
  },
  other: {
    first: {
      borderRadius: 20,
      borderBottomLeftRadius: 3,
      marginBottom: 1,
      overflow: 'hidden'

    },
    middle: {
      borderRadius: 20,
      borderTopLeftRadius: 3,
      borderBottomLeftRadius: 3,
      marginVertical: 1,
      overflow: 'hidden'
    },
    last: {
      borderRadius: 20,
      borderTopLeftRadius: 3,
      marginTop: 1,
      overflow: 'hidden'
    },
    single: {
      borderRadius: 20,
      overflow: 'hidden'
    }
  },
  image: {
    user: {
      first: { borderRadius: 10, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      middle: { borderRadius: 10, borderTopRightRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      last: { borderRadius: 10, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent' }
    },
    other: {
      first: { borderRadius: 10, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      middle: { borderRadius: 10, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      last: { borderRadius: 10, borderTopLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent' }
    }
  },
  reply: {
    user: {
      first: { borderRadius: 10, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      middle: { borderRadius: 10, borderTopRightRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      last: { borderRadius: 10, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' }
    },
    other: {
      first: { borderRadius: 10, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      middle: { borderRadius: 10, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      last: { borderRadius: 10, borderTopLeftRadius: 3, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' },
      single: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent', borderLeftWidth: 3, borderLeftColor: '#FF587E' }
    }
  }
};



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
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',

    // Assure que le contenu est au-dessus du background
  },

  containerFilter: {
    flex: 1,
    zIndex: 1,
  },

  scrollContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingLeft: 6,
  },

  containerAddSecret: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'start',
    alignItems: 'center',
    width: '100%'
  },


  activeButton: {
    backgroundColor: '#FF78B2',
    fontWeight: 'Bold',
    fontSize: 12,  // Font size for secondary variant
    lineHeight: 22,
    fontFamily: 'SF-Pro-Display-Bold',
    color: '#FF78B2',
  },

  inactiveButton: {
    backgroundColor: 'white',
    fontWeight: 'Bold',
    fontSize: 12,  // Font size for secondary variant
    lineHeight: 22,
    fontFamily: 'SF-Pro-Display-Bold',
    color: '#FF78B2',
  },

  activeText: {
    fontWeight: 'Bold',
    fontSize: 14,  // Font size for secondary variant
    lineHeight: 22,
    fontFamily: 'SF-Pro-Display-Bold',
    color: 'white', // Texte blanc pour le bouton actif
  },
  inactiveText: {
    fontWeight: 'Bold',
    fontSize: 14,  // Font size for secondary variant
    lineHeight: 22,
    fontFamily: 'SF-Pro-Display-Bold',
    color: '#94A3B8', // Texte gris pour les autres boutons
  },

  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 1.5 }],
  },

  icon: {

    transform: [{ scale: 1.3 }],
  },

  searchButton: {
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 50,
    backgroundColor: 'transparent',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',

  },

  containerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  
  },
  containerHome: {
    backgroundColor: 'transparent',
    flex: 1,
    marginTop: 1,
    paddingBottom: 45,
    paddingLeft: 20,
    paddingRight: 20,
    // Assure que le contenu est au-dessus du background
  },
  safeArea: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // SafeArea pour le haut uniquement
    flex: 1,
    paddingTop: 20,
    backgroundColor: 'transparent', // Ajoutez un fond global si nécessaire
  },
  swipper: {
    backgroundColor: 'transparent',
    flex: 1,
  },

  filterOption: {
    fontSize: 16,
    marginVertical: 10,
  },

  blurBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayModal: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  overlayContent: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 22 : StatusBar.currentHeight + 10,
    paddingHorizontal: 25,
    flex: 1,
  },

  closeButton: {
    zIndex: 10,
  },

  checkbox: {
    marginBottom: 10,
    width: '100%'
  },

  boxShadow: {
    shadowColor: 'violet', // Couleur de l'ombre
    shadowOffset: { width: 0, height: 3 }, // Décalage de l'ombre
    shadowOpacity: 0.2, // Opacité de l'ombre
    shadowRadius: 6, // Rayon de diffusion
    elevation: 10, // Ombre Android
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
    left: -50,
    width: '150%',
    height: '120%',
    zIndex: 1, // Assure que l'overlay est au-dessus
  },

  overlayCardResult: {
    position: 'absolute',
    left: -50,
    width: '150%',
    height: '100%',
    zIndex: 1, // Assure que l'overlay est au-dessus
  },


  resultItem: {
    paddingVertical: 1,

  },
  resultContainer: {
    flexDirection: "column",
    marginBottom: "20",
    paddingBottom: 20,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: 4, // Espacement entre les statistiques
  },
  label: {
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14,
    color: '#FF5A7D',
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
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'SF-Pro-Display-Bold',
  },
  h4: {
    fontSize: 20,
    lineHeight: 22,
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
    textDecoration: 'underline'
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

  shadowContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5, // Pour Android
    padding: 10,
  },

  inputBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    height: 50,
  },

});


