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

console.log("Flow network configured:", {
  network: currentNetwork,
  accessNode: fclConfig["accessNode.api"],
  discovery: fclConfig["discovery.authn.endpoint"],
});

fcl.config(fclConfig);

// Initialize WalletConnect plugin lazily to avoid Expo async require issues
let clientPromiseResolver: ((client: any) => void) | null = null;
const clientPromise = new Promise<any>((resolve) => {
  clientPromiseResolver = resolve;
});

let initializationPromise: Promise<void> | null = null;

const initializeWalletConnect = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log("Initializing WalletConnect...");

      // Generate Expo-compatible redirect URI for automatic return after wallet approval
      // This uses Expo Linking API which handles both Expo Go (exp://) and standalone builds (custom scheme)
      // Using empty path redirects to the root route (index)
      const ExpoLinking = await import("expo-linking");
      const redirectUri = ExpoLinking.createURL("");
      console.log("Generated redirect URI for WalletConnect:", redirectUri);

      // @ts-ignore - initLazy is exported but not in type definitions
      console.log("Calling fcl.initLazy...");
      const { FclWcServicePlugin, clientPromise: wcClientPromise } = fcl.initLazy({
        projectId: "9b70cfa398b2355a5eb9b1cf99f4a981",
        metadata: {
          name: "Flow Expo Starter",
          description: "A Flow blockchain demo app built with Expo",
          url: "https://flow-expo-starter.com",
          icons: ["https://avatars.githubusercontent.com/u/62387156?v=4"],
        },
        // Redirect URI for wallet to automatically return to dApp after approval
        // In Expo Go: exp://192.168.x.x:19000 (root route)
        // In standalone: flowexpostarter:// (root route)
        redirect: redirectUri,
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
      console.log("fcl.initLazy completed, plugin created with services:", FclWcServicePlugin.services);

      // Resolve the client promise
      console.log("Waiting for WalletConnect client promise...");
      const client = await wcClientPromise;
      console.log("WalletConnect client promise resolved");
      if (clientPromiseResolver) {
        clientPromiseResolver(client);
      }

      console.log("WalletConnect initialized successfully:", {
        activeSessions: client.session.getAll().length,
        projectId: "9b70cfa3...",
      });

      // Register the WalletConnect service plugin
      console.log("Registering plugin with services:", FclWcServicePlugin.services);
      fcl.pluginRegistry.add(FclWcServicePlugin);
      console.log("WalletConnect plugin registered");
    } catch (error) {
      console.error("Failed to initialize WalletConnect:", error);
      throw error;
    }
  })();

  return initializationPromise;
};

// Start initialization immediately but don't block module loading
initializeWalletConnect();

// Clean up orphaned sessions immediately on app start
// This handles the case where the wallet deleted the session while the app was closed
// We do this ASAP to prevent UI flicker
export const sessionCleanupPromise = (async () => {
  try {
    console.log("Checking for orphaned WalletConnect sessions...");

    // Wait for WalletConnect client to initialize
    const client = await clientPromise;
    const user = await fcl.currentUser.snapshot();

    console.log("Session check status:", {
      userLoggedIn: user.loggedIn,
      userAddress: user.addr || null,
    });

    if (user.loggedIn) {
      const hasWcService = user.services?.some(
        (s: any) => s.method === "WC/RPC"
      );
      const activeSessions = client.session.getAll();

      console.log("Session details:", {
        hasWcService,
        activeSessions: activeSessions.length,
      });

      if (hasWcService && activeSessions.length === 0) {
        console.log("Cleaning up orphaned WalletConnect session");
        await fcl.unauthenticate();
        console.log("Orphaned session cleaned up");
      } else {
        console.log("No orphaned sessions found");
      }
    } else {
      console.log("No active user session to check");
    }
  } catch (e) {
    // Ignore errors during cleanup as this is not critical
    console.warn("Could not check for orphaned sessions:", e);
  }
})();

export { clientPromise, currentNetwork };
