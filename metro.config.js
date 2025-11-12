const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// TODO: NEED TO BE ADJUSTED WHEN FCL-REACT-NATIVE IS PUBLISHED

// Path to the fcl-react-native package (symlinked)
const fclReactNativePath = path.resolve(
  __dirname,
  "../fcl-js/packages/fcl-react-native"
);
const fclJsRoot = path.resolve(__dirname, "../fcl-js");

// Get default Expo config
const config = getDefaultConfig(__dirname);

// Watch the entire fcl-js monorepo to allow Metro to see all packages and their dependencies
config.watchFolders = [fclJsRoot];

// Resolve modules from all node_modules directories in order
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"), // Test app's node_modules (highest priority)
  path.resolve(fclJsRoot, "node_modules"), // Monorepo root node_modules
  path.resolve(fclReactNativePath, "node_modules"), // fcl-react-native's node_modules
];

// Map peer dependencies to use test app's versions (avoid duplicates)
config.resolver.extraNodeModules = {
  // React Native peer dependencies - MUST use test app's versions
  react: path.resolve(__dirname, "node_modules/react"),
  "react-native": path.resolve(__dirname, "node_modules/react-native"),
  "@react-native-async-storage/async-storage": path.resolve(
    __dirname,
    "node_modules/@react-native-async-storage/async-storage"
  ),
  "expo-linking": path.resolve(__dirname, "node_modules/expo-linking"),
  "expo-web-browser": path.resolve(__dirname, "node_modules/expo-web-browser"),
  "expo-crypto": path.resolve(__dirname, "node_modules/expo-crypto"),

  // WalletConnect packages - MUST use test app's versions
  "@walletconnect/sign-client": path.resolve(
    __dirname,
    "node_modules/@walletconnect/sign-client"
  ),
  "@walletconnect/react-native-compat": path.resolve(
    __dirname,
    "node_modules/@walletconnect/react-native-compat"
  ),
  "@walletconnect/types": path.resolve(
    __dirname,
    "node_modules/@walletconnect/types"
  ),
  "@walletconnect/utils": path.resolve(
    __dirname,
    "node_modules/@walletconnect/utils"
  ),
  // @walletconnect/keyvaluestorage - use from fcl-js monorepo
  "@walletconnect/keyvaluestorage": path.resolve(
    fclJsRoot,
    "node_modules/@walletconnect/core/node_modules/@walletconnect/keyvaluestorage"
  ),

  // @onflow monorepo packages - map to workspace packages
  "@onflow/fcl-react-native": fclReactNativePath,
  "@onflow/fcl-core": path.join(fclJsRoot, "packages/fcl-core"),
  "@onflow/config": path.join(fclJsRoot, "packages/config"),
  "@onflow/sdk": path.join(fclJsRoot, "packages/sdk"),
  "@onflow/types": path.join(fclJsRoot, "packages/types"),
  "@onflow/typedefs": path.join(fclJsRoot, "packages/typedefs"),
  "@onflow/rlp": path.join(fclJsRoot, "packages/rlp"),
  "@onflow/transport-http": path.join(fclJsRoot, "packages/transport-http"),
  "@onflow/util-actor": path.join(fclJsRoot, "packages/util-actor"),
  "@onflow/util-address": path.join(fclJsRoot, "packages/util-address"),
  "@onflow/util-invariant": path.join(fclJsRoot, "packages/util-invariant"),
  "@onflow/util-logger": path.join(fclJsRoot, "packages/util-logger"),
  "@onflow/util-semver": path.join(fclJsRoot, "packages/util-semver"),
  "@onflow/util-template": path.join(fclJsRoot, "packages/util-template"),
  "@onflow/util-uid": path.join(fclJsRoot, "packages/util-uid"),
};

// Custom resolver to handle TypeScript source files and .js extensions in imports
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force AsyncStorage to always resolve from test app's node_modules
  if (moduleName === "@react-native-async-storage/async-storage") {
    const asyncStoragePath = path.resolve(
      __dirname,
      "node_modules/@react-native-async-storage/async-storage"
    );
    try {
      const packageJson = require(path.join(asyncStoragePath, "package.json"));
      const mainFile = packageJson.main || "lib/index.js";
      return {
        type: "sourceFile",
        filePath: path.join(asyncStoragePath, mainFile),
      };
    } catch (e) {
      // Fall back to default resolution
    }
  }

  // Force expo modules to always resolve from test app's node_modules
  if (moduleName === "expo-linking" || moduleName === "expo-web-browser") {
    const expoModulePath = path.resolve(__dirname, "node_modules", moduleName);
    try {
      const packageJson = require(path.join(expoModulePath, "package.json"));
      const mainFile = packageJson.main || "index.js";
      return {
        type: "sourceFile",
        filePath: path.join(expoModulePath, mainFile),
      };
    } catch (e) {
      // Fall back to default resolution
    }
  }

  // Force WalletConnect keyvaluestorage to use React Native version
  if (moduleName === "@walletconnect/keyvaluestorage") {
    const wcModulePath = path.resolve(
      fclJsRoot,
      "node_modules/@walletconnect/core/node_modules/@walletconnect/keyvaluestorage"
    );
    const reactNativeEntry = path.join(
      wcModulePath,
      "dist/react-native/index.js"
    );
    return {
      type: "sourceFile",
      filePath: reactNativeEntry,
    };
  }

  // Force other WalletConnect packages to always resolve from test app's node_modules
  if (moduleName.startsWith("@walletconnect/")) {
    const wcModulePath = path.resolve(__dirname, "node_modules", moduleName);
    try {
      const packageJson = require(path.join(wcModulePath, "package.json"));
      const mainFile =
        packageJson["react-native"] || packageJson.main || "index.js";
      return {
        type: "sourceFile",
        filePath: path.join(wcModulePath, mainFile),
      };
    } catch (e) {
      // Fall back to default resolution
    }
  }

  // Check if this is an @onflow package from our monorepo
  if (moduleName.startsWith("@onflow/")) {
    const packageName = moduleName.split("/")[1];
    const packagePath = path.join(fclJsRoot, "packages", packageName);

    try {
      const packageJson = require(path.join(packagePath, "package.json"));

      // If package.json has a "source" field, resolve to source files instead of dist
      if (packageJson.source) {
        const sourcePath = path.join(packagePath, packageJson.source);
        return {
          type: "sourceFile",
          filePath: sourcePath,
        };
      }
    } catch (e) {
      // Package doesn't exist or no source field, continue with default resolution
    }
  }

  // Handle relative imports with .js extension in TypeScript source files
  // TypeScript uses .js extensions in imports, but the actual files are .ts
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    const tsModuleName = moduleName.replace(/\.js$/, ".ts");

    try {
      // Try to resolve as .ts file
      const result = context.resolveRequest(context, tsModuleName, platform);
      if (result) {
        return result;
      }
    } catch (e) {
      // If .ts doesn't work, try original .js
    }
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Add TypeScript extensions and ensure they're checked before .js
config.resolver.sourceExts = ["ts", "tsx", "js", "jsx", "json", "mjs", "cjs"];

// Enable symlink resolution
config.resolver.unstable_enableSymlinks = true;

// Enable platform-specific extensions (important for WalletConnect React Native support)
config.resolver.platforms = ["android", "ios", "native", "web"];

// Resolve React Native entry points from package.json
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Block React from being resolved from fcl-js node_modules to prevent duplicates
config.resolver.blockList = [
  new RegExp(`${fclJsRoot.replace(/[/\\]/g, "[/\\\\]")}/node_modules/react/.*`),
  new RegExp(
    `${fclJsRoot.replace(/[/\\]/g, "[/\\\\]")}/node_modules/react-native/.*`
  ),
];

// Increase max workers for better performance with large monorepo
config.maxWorkers = 2;

module.exports = config;
