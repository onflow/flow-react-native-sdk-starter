// IMPORTANT: This must be imported first, before any other imports
import "react-native-get-random-values";

import * as fcl from "@onflow/fcl-react-native";
import * as Crypto from "expo-crypto";
import { LogBox } from "react-native";

// Suppress expected warnings and errors that are harmless and can be ignored
// These include Metro bundler warnings or WalletConnect cleanup messages
LogBox.ignoreLogs([
  "Attempted to import the module",
  'is not listed in the "exports"',
  "Falling back to file-based resolution",
  "emitting session_request",
  "without any listeners",
  "Service Discovery Error",
  "Failed to fetch services",
]);

// Also ignore console.error for WalletConnect session request errors
// These happen when cleaning up old sessions and can be safely ignored
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.join(" ");
  if (
    errorMessage.includes("emitting session_request") ||
    errorMessage.includes("without any listeners") ||
    errorMessage.includes("Service Discovery Error") ||
    errorMessage.includes("Failed to fetch services")
  ) {
    return; // Suppress these specific errors
  }
  originalConsoleError(...args);
};

// Additional crypto.getRandomValues polyfill using expo-crypto as backup
if (typeof global.crypto === "undefined") {
  global.crypto = {} as any;
}
if (typeof global.crypto.getRandomValues === "undefined") {
  global.crypto.getRandomValues = ((array: Uint8Array) => {
    const randomBytes = Crypto.getRandomBytes(array.length);
    array.set(randomBytes);
    return array;
  }) as any;
}

// Network configurations
const flowConfig = {
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
    "discovery.authn.endpoint":
      "https://fcl-discovery.onflow.org/api/testnet/authn",
  },
  mainnet: {
    "accessNode.api": "https://rest-mainnet.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",
    "discovery.authn.endpoint":
      "https://fcl-discovery.onflow.org/api/mainnet/authn",
  },
};

const currentNetwork = "testnet"; // Change to 'mainnet' for production

// Initialize FCL configuration with redirect URI
// IMPORTANT: This must be done asynchronously to ensure redirect URI is available
// BEFORE WalletConnect initializes (which happens when walletconnect.projectId is set)
(async () => {
  const ExpoLinking = await import("expo-linking");
  const redirectUri = ExpoLinking.createURL("");
  console.log("Generated redirect URI for WalletConnect:", redirectUri);

  // Configure FCL with ALL settings including redirect
  // This ensures redirect is available when WalletConnect auto-loads
  const fclConfig = {
    ...flowConfig[currentNetwork],
    "app.detail.title": "Flow Expo Starter",
    "app.detail.url": "https://flow-expo-starter.com",
    "app.detail.icon": "https://avatars.githubusercontent.com/u/62387156?v=4",
    "app.detail.description": "A Flow blockchain demo app built with Expo",
    "fcl.limit": 1000,
    "walletconnect.redirect": redirectUri, // Set redirect BEFORE projectId
    "walletconnect.projectId": "9b70cfa398b2355a5eb9b1cf99f4a981", // Auto-loads WalletConnect with redirect configured
    "flow.network": currentNetwork,
  };

  console.log("Flow network configured:", {
    network: currentNetwork,
    accessNode: fclConfig["accessNode.api"],
    discovery: fclConfig["discovery.authn.endpoint"],
    walletConnect: "Auto-loading with Flow Reference Wallet",
    redirectUri: redirectUri,
  });

  fcl.config(fclConfig);
})();

export { currentNetwork };
