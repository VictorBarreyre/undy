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
        background: "#EFEFEF",
       
    },
    

    components: {        
        Input: {
            baseStyle: {
                paddingTop: 3,
                paddingBottom: 3,
                paddingLeft: 6,
                paddingRight: 8,
                w: '100%',
                borderRadius: 30,
                borderColor: 'transparent',
                backgroundColor: 'white',
                shadowColor: '#7957CC', // Couleur de l'ombre interne
                shadowOffset: { width: 0, height: 2 }, // Position de l'ombre
                shadowOpacity: 0.2, // Opacité de l'ombre
                shadowRadius: 2, // Rayon de flou
                elevation: 1, // Ombre sur Android
                _focus: {
                    borderColor: "#F97794",
                    backgroundColor: 'white',
                },
                _placeholder: {
                    color: "#94A3B8", // Couleur du placeholder
                    fontSize: '14px', // Taille du placeholder
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
                backgroundColor:'black',
                _text: {
                    color: 'white',
                    fontWeight: 'bold',
                },
            },
            defaultProps: {
                variant: 'primary',
            },
        },
    },
});


export { lightTheme };
