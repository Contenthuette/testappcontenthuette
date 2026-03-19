const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");
const { FileStore } = require("metro-cache");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const appNodeModules = path.resolve(projectRoot, "node_modules");

/**
 * SINGLETON MODULE RESOLUTION
 *
 * In bun monorepos, packages live in node_modules/.bun/ and are symlinked.
 * When Metro follows different symlink chains (app → convex/react vs
 * better-auth → convex/react), it can load TWO copies of the same module.
 *
 * This breaks React context: ConvexBetterAuthProvider creates context with
 * one copy, but the app reads with another → "Could not find ConvexProviderWithAuth".
 *
 * Fix: Resolve each singleton to its canonical (real) file path at config time,
 * then force ALL imports to use that exact path.
 */
function resolveCanonical(specifier) {
  try {
    const resolved = require.resolve(specifier, { paths: [appNodeModules] });
    return fs.realpathSync(resolved);
  } catch {
    return null;
  }
}

const SINGLETONS = {};
for (const spec of ["convex/react", "react", "react/jsx-runtime"]) {
  const canonical = resolveCanonical(spec);
  if (canonical) {
    SINGLETONS[spec] = canonical;
  }
}

const config = getDefaultConfig(projectRoot);

// Monorepo setup
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  appNodeModules,
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Force singleton resolution — returns exact file paths, no further resolution needed
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLETONS[moduleName]) {
    return { type: "sourceFile", filePath: SINGLETONS[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Isolated cache per project
config.cacheStores = [
  new FileStore({
    root: path.join(appNodeModules, ".cache", "metro"),
  }),
];

module.exports = config;
