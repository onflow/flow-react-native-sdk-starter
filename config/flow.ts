// Crypto polyfill - must be imported first
import "react-native-get-random-values";

import * as fcl from "@onflow/fcl-react-native";
import * as Crypto from "expo-crypto";
import { LogBox } from "react-native";

// Suppress expected warnings from Metro bundler and WalletConnect
LogBox.ignoreLogs([
  "Attempted to import the module",
  'is not listed in the "exports"',
  "Falling back to file-based resolution",
  "emitting session_request",
  "without any listeners",
  "Service Discovery Error",
  "Failed to fetch services",
]);

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.join(" ");
  if (
    errorMessage.includes("emitting session_request") ||
    errorMessage.includes("without any listeners") ||
    errorMessage.includes("Service Discovery Error") ||
    errorMessage.includes("Failed to fetch services")
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Backup crypto polyfill using expo-crypto
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

export const currentNetwork = "testnet";

const networks = {
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

fcl.config({
  ...networks[currentNetwork],
  "flow.network": currentNetwork,

  "app.detail.title": "Flow Expo Starter",
  "app.detail.url": "https://flow.com",
  "app.detail.icon": "https://avatars.githubusercontent.com/u/62387156?v=4",
  "app.detail.description": "A Flow blockchain starter app built with Expo",

  "walletconnect.projectId": "9b70cfa398b2355a5eb9b1cf99f4a981",
});
