const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo support: watch root + resolve from both locations.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// ---------------------------------------------------------------------------
// Singleton enforcement.
// In bun workspaces the .bun cache can hold TWO physical copies of a package
// (e.g. node_modules/.bun/convex@…/node_modules/convex AND
// node_modules/.bun/node_modules/convex). Metro keys modules by *path*, so
// two paths = two module instances = two React contexts = provider not found.
//
// Fix: for any package that relies on shared singleton state (React context,
// module-level variables, etc.), force Metro to resolve it from the project
// root so every importer gets the exact same physical file.
// ---------------------------------------------------------------------------
const SINGLETONS = ["convex", "react", "react-native", "react-dom"];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only intercept bare specifiers (skip relative & absolute paths).
  if (moduleName.startsWith(".") || moduleName.startsWith("/")) {
    return context.resolveRequest(context, moduleName, platform);
  }

  const pkgName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];

  if (SINGLETONS.includes(pkgName)) {
    // Re-resolve as if the import originated from the project root.
    // This guarantees Metro walks apps/default/node_modules/ first,
    // landing on the canonical symlink every time.
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, "_singleton.js") },
      moduleName,
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
