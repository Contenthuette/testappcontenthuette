const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

// Load environment variables from monorepo root
require("@expo/env").loadProjectEnv(monorepoRoot, { force: true });

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
];

// Ensure asset resolution always checks the shared assets directory
config.resolver.assetExts = config.resolver.assetExts || [];
const sharedAssetsDir = path.resolve(monorepoRoot, "assets");
if (!config.watchFolders.includes(sharedAssetsDir)) {
  config.watchFolders.push(sharedAssetsDir);
}

// Redirect asset requests from the ghost apps/default/images/ to the real assets/images/
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If the request looks like a local ./images/ or ../images/ asset path
  // and the file doesn't exist at the resolved location, try the shared assets folder
  if (moduleName && typeof moduleName === "string") {
    const localImagesDir = path.join(projectRoot, "images");
    const sharedImagesDir = path.join(monorepoRoot, "assets", "images");
    if (moduleName.includes(localImagesDir) || moduleName.startsWith("./images/")) {
      const basename = path.basename(moduleName);
      const sharedPath = path.join(sharedImagesDir, basename);
      if (fs.existsSync(sharedPath)) {
        return { type: "sourceFile", filePath: sharedPath };
      }
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
