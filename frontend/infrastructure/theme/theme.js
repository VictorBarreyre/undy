import { extendTheme } from 'native-base';

// Thème clair
const lightTheme = extendTheme({
    colors: {
        primary: {
            50: "#e3f2f9",
            100: "#c8e4f6",
            200: "#a4d2f2",
            300: "#79bef3",
            400: "#47a9e1",
            500: "#2196f3", // Couleur principale
            600: "#1b84cc",
            700: "#1769aa",
            800: "#14518a",
            900: "#104176",
        },
        background: "transparent", 
       
    },
    

    components: {        

        Box: {
            baseStyle: {
                backgroundColor: 'transparent', // Transparent par défaut
            },
        },
        
        Input: {
            baseStyle: {
                paddingTop: 3,
                paddingBottom: 3,
                paddingLeft: 6,
                paddingRight: 8,
             
                borderRadius: 30,
                borderColor:'transparent',
                backgroundColor:'white',
                _focus: {
                    borderColor: "#F97794",
                    backgroundColor:'white',
                },
                _placeholder: {
                    color: "#94A3B8", // Ici, vous pouvez mettre la couleur que vous souhaitez
                    fontSize: '14px', // Vous pouvez aussi changer la taille du texte du placeholder
                },
            },
            defaultProps: {
                placeholderTextColor: "#94A3B8",
                variant: 'primary',
                fontSize: '14px',
            },
        },

        Button: {
            baseStyle: {
              paddingTop: 3,
              paddingBottom: 3,
              paddingLeft: 6,
              paddingRight: 8,
              borderRadius: 30,
              _text: {
                color: 'white',
                lineHeight: 28, // Ajout depuis `cta`
                fontWeight: '700', // Ajout depuis `cta`
                fontFamily: 'SF-Pro-Display-Bold', // Ajout depuis `cta`
              },
              _pressed: {
                backgroundColor: 'gray.700',
                transform: [{ scale: 0.95 }],
              },
            },
            variants: {
              primary: {
                backgroundColor: 'black',
                width:'100%',
                _text: {
                  color: 'white',
                  fontSize: 18, // Ajout depuis `cta`
                  lineHeight: 28, // Ajout depuis `cta`
                  fontWeight: '700', // Ajout depuis `cta`
                  fontFamily: 'SF-Pro-Display-Bold', // Ajout depuis `cta`
                },
              },
              secondary: {
                paddingTop: 1,
                paddingBottom: 1,
                paddingLeft: 4,
                paddingRight: 4,
                backgroundColor: 'transparent',
                borderColor: '#F97794', // Border color for secondary button
                borderWidth: 2,
                _pressed: {
                  backgroundColor: 'rgba(249, 119, 148, 0.2)', // Lighter background when pressed
                },
                _text: {
                  fontWeight: 'Bold',
                  fontSize: 14,  // Font size for secondary variant
                  lineHeight: 22,
                  fontFamily: 'SF-Pro-Display-Bold',
                  color: 'black',
              },
              },
            },
            defaultProps: {
              variant: 'primary', // Default variant
            },
          },

    },
});


export { lightTheme };
