const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = fs.realpathSync(__dirname);
const monorepoRoot = fs.realpathSync(path.resolve(projectRoot, "../.."));

const config = getDefaultConfig(projectRoot);

// Preserve Expo defaults and add the monorepo root.
config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), monorepoRoot]),
);

// Resolve modules from the app's node_modules first, then root.
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
    ...(config.resolver.nodeModulesPaths ?? []),
  ]),
);

module.exports = config;
