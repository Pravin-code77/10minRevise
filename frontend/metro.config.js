const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    ieee754: require.resolve('ieee754'),
    buffer: require.resolve('buffer'),
    crypto: require.resolve('react-native-get-random-values'),
};

module.exports = config;
