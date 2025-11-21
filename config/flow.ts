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

// Initialize FCL configuration
// Redirect URI is now auto-detected by fcl-react-native using expo-linking
const fclConfig = {
  ...flowConfig[currentNetwork],
  "app.detail.title": "Flow Expo Starter",
  "app.detail.url": "https://flow-expo-starter.com",
  "app.detail.icon": "https://avatars.githubusercontent.com/u/62387156?v=4",
  "app.detail.description": "A Flow blockchain demo app built with Expo",
  "fcl.limit": 1000,
  // Debug-only: Add Flow Wallet with native deep link for testing with debug builds
  // Production builds work fine with Discovery API (uses universal links)
  // But debug builds can't verify App Links, so we add this with native scheme
  "walletconnect.wallets": [
    {
      name: "Flow Wallet (Debug)",
      description: "Digital wallet created for everyone.",
      homepage: "https://wallet.flow.com",
      uid: "frw://wc", // Native deep link - works in debug builds
      provider: {
        name: "Flow Wallet (Debug)",
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI1MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8xN182OTM0KSI+CjxyZWN0IHdpZHRoPSIyNTAiIGhlaWdodD0iMjUwIiBmaWxsPSIjMkNERTc4Ii8+CjxjaXJjbGUgY3g9IjEyNSIgY3k9IjEyNSIgcj0iODMiIGZpbGw9IndoaXRlIi8+CjxyZWN0IHg9IjExNCIgeT0iMTEyIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiM0MUNDNUQiLz4KPHJlY3QgeD0iMTM4IiB5PSIxMTIiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iYmxhY2siLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF8xN182OTM0Ij4KPHJlY3Qgd2lkdGg9IjI1MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==",
        description: "Digital wallet created for everyone.",
        website: "https://core.flow.com",
        address: "debug-0xc7efa8c33fceee03", // Unique address to avoid React key collision
        color: "#41CC5D",
      },
    },
  ],
  "walletconnect.projectId": "9b70cfa398b2355a5eb9b1cf99f4a981", // Auto-loads WalletConnect (redirect auto-detected)
  "flow.network": currentNetwork,
};

console.log("Flow network configured:", {
  network: currentNetwork,
  accessNode: fclConfig["accessNode.api"],
  discovery: fclConfig["discovery.authn.endpoint"],
  walletConnect: "Auto-loading with Flow Reference Wallet (redirect auto-detected)",
});

fcl.config(fclConfig);

export { currentNetwork };
