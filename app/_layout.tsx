// IMPORTANT: Flow config must be imported first (it includes crypto polyfill)
import "../config/flow";

import { FlowProvider } from "@onflow/react-native-sdk";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { currentNetwork } from "@/config/flow";
import { useColorScheme } from "@/hooks/use-color-scheme";

const flowConfig = {
  accessNodeUrl:
    currentNetwork === "testnet"
      ? "https://rest-testnet.onflow.org"
      : "https://rest-mainnet.onflow.org",
  discoveryWallet:
    currentNetwork === "testnet"
      ? "https://fcl-discovery.onflow.org/testnet/authn"
      : "https://fcl-discovery.onflow.org/mainnet/authn",
  discoveryAuthnEndpoint:
    currentNetwork === "testnet"
      ? "https://fcl-discovery.onflow.org/api/testnet/authn"
      : "https://fcl-discovery.onflow.org/api/mainnet/authn",
  flowNetwork: currentNetwork as "testnet" | "mainnet",
  appDetailTitle: "Flow Expo Starter",
  appDetailUrl: "https://flow.com",
  appDetailIcon: "https://avatars.githubusercontent.com/u/62387156?v=4",
  appDetailDescription: "A Flow blockchain starter app built with Expo",
  walletconnectProjectId: "9b70cfa398b2355a5eb9b1cf99f4a981",
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <FlowProvider config={flowConfig}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </FlowProvider>
  );
}
