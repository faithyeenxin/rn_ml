/** @format */

const { getDefaultConfig } = require("@expo/metro-config");
const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts.push("ort");
defaultConfig.resolver.assetExts.push("onnx");

module.exports = defaultConfig;
