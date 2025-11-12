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
]);

// Also ignore console.error for WalletConnect session request errors
// These happen when cleaning up old sessions and can be safely ignored
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.join(" ");
  if (
    errorMessage.includes("emitting session_request") ||
    errorMessage.includes("without any listeners")
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

// TODO: improve this
// Configure FCL for Flow
const fclConfig = {
  ...flowConfig[currentNetwork],
  "app.detail.title": "Flow Expo Starter",
  "app.detail.url": "https://flow-expo-starter.com",
  "app.detail.icon": "https://avatars.githubusercontent.com/u/62387156?v=4",
  "app.detail.description": "A Flow blockchain demo app built with Expo",
  "fcl.limit": 1000, // Compute limit for transactions
  "walletconnect.projectId": "9b70cfa398b2355a5eb9b1cf99f4a981", // WalletConnect Project ID
  "flow.network": currentNetwork,
};
fcl.config(fclConfig);

// Initialize WalletConnect plugin
const { FclWcServicePlugin, clientPromise } = fcl.initLazy({
  projectId: "9b70cfa398b2355a5eb9b1cf99f4a981",
  metadata: {
    name: "Flow Expo Starter",
    description: "A Flow blockchain demo app built with Expo",
    url: "https://flow-expo-starter.com",
    icons: ["https://avatars.githubusercontent.com/u/62387156?v=4"],
  },
  // Manually add FRW wallet for testing with universal link for FRW (works on both iOS and Android)
  wallets: [
    {
      name: "Flow Reference Wallet",
      description: "Connect to Flow Reference Wallet via WalletConnect",
      homepage: "https://frw.gitbook.io/",
      uid: "https://link.wallet.flow.com/wc",
      provider: {
        name: "Flow Reference Wallet",
        icon: "https://frw-link.s3.amazonaws.com/logo.png",
        description: "Digital wallet created for everyone.",
        website: "https://frw.gitbook.io/",
      },
    },
  ],
});

// Register the WalletConnect service plugin
fcl.pluginRegistry.add(FclWcServicePlugin);

// Clean up orphaned sessions immediately on app start
// This handles the case where the wallet deleted the session while the app was closed
// We do this ASAP to prevent UI flicker
export const sessionCleanupPromise = (async () => {
  try {
    // Wait for WalletConnect client to initialize
    const client = await clientPromise;
    const user = await fcl.currentUser.snapshot();

    if (user.loggedIn) {
      const hasWcService = user.services?.some(
        (s: any) => s.method === "WC/RPC"
      );
      const activeSessions = client.session.getAll();

      if (hasWcService && activeSessions.length === 0) {
        console.log("Cleaning up orphaned WalletConnect session");
        await fcl.unauthenticate();
      }
    }
  } catch (e) {
    // Ignore errors during cleanup as this is not critical
    console.warn("Could not check for orphaned sessions:", e);
  }
})();

export { clientPromise, currentNetwork };
