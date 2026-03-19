const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace root
config.watchFolders = [workspaceRoot];

// Ensure Metro finds packages in both app and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force singleton resolution for critical packages
config.resolver.extraNodeModules = {
  "@expo/metro-runtime": path.resolve(projectRoot, "node_modules/@expo/metro-runtime"),
  "convex": path.resolve(projectRoot, "node_modules/convex"),
  "react": path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

module.exports = config;
