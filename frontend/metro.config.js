// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    // Ajoutez un chemin clair pour éviter les erreurs de résolution
    '@react-native-community/blur': require.resolve('@react-native-community/blur'),
};

module.exports = config;
