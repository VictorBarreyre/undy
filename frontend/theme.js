// themes.js
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
        background: "#ffffff",
        text: "#000000",
    },
});

// Thème sombre
const darkTheme = extendTheme({
    colors: {
        primary: {
            50: "#1a1a1b",
            100: "#252526",
            200: "#3b3b3c",
            300: "#484849",
            400: "#5a5a5c",
            500: "#6a6a6c", // Couleur principale sombre
            600: "#7d7d7e",
            700: "#a4a4a5",
            800: "#c1c1c2",
            900: "#e2e2e3",
        },
        background: "#121212",
        text: "#ffffff",
    },
});

export { lightTheme, darkTheme };
