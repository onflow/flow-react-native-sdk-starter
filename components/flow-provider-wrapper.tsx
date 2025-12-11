import { FlowProvider } from "@onflow/react-native-sdk";
import flowJSON from "../flow.json";

interface FlowProviderWrapperProps {
  children: any;
}

export function FlowProviderWrapper({ children }: FlowProviderWrapperProps) {
  return (
    <FlowProvider
      config={{
        // Testnet configuration
        accessNodeUrl: "https://rest-testnet.onflow.org",
        discoveryWallet: "https://fcl-discovery.onflow.org/testnet/authn",
        discoveryAuthnEndpoint:
          "https://fcl-discovery.onflow.org/api/testnet/authn",
        flowNetwork: "testnet",

        // App metadata
        appDetailTitle: "Flow Expo Starter",
        appDetailUrl: "https://flow.com",
        appDetailIcon: "https://avatars.githubusercontent.com/u/62387156?v=4",
        appDetailDescription: "A Flow blockchain starter app built with Expo",

        // WalletConnect project ID
        walletconnectProjectId: "9b70cfa398b2355a5eb9b1cf99f4a981",
      }}
      flowJson={flowJSON}
    >
      {children}
    </FlowProvider>
  );
}
