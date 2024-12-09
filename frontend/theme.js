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
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 6,
                paddingRight: 8,
                w:'100%',
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
                paddingTop: 4,
                paddingBottom: 4,
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
