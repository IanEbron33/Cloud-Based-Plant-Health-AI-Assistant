const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add .webm to asset extensions for mascot animation video
config.resolver.assetExts.push("webm");

module.exports = withNativeWind(config, { input: "./src/global.css" });
