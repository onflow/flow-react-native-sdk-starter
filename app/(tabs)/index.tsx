import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { currentNetwork } from "@/config/flow";
import * as fcl from "@onflow/fcl-react-native";
import {
  Connect,
  useFlowCurrentUser,
  useFlowMutate,
  useFlowQuery,
  useFlowTransactionStatus,
} from "@onflow/react-native-sdk";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const FlowLogo = require("@/assets/flow.png");

const getStatusName = (status: number): string => {
  const statusNames: { [key: number]: string } = {
    0: "UNKNOWN",
    1: "PENDING",
    2: "FINALIZED",
    3: "EXECUTED",
    4: "SEALED",
    5: "EXPIRED",
  };
  return statusNames[status] || "UNKNOWN";
};

// Cadence script to get FLOW balance
const GET_BALANCE_SCRIPT = `
  import FlowToken from 0x7e60df042a9c0868
  import FungibleToken from 0x9a0766d93b6608b7

  access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    let vaultRef = account.capabilities
      .borrow<&FlowToken.Vault>(/public/flowTokenBalance)
      ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
  }
`;

// Cadence transaction to log a message
const LOG_MESSAGE_TX = `
  transaction(message: String) {
    prepare(signer: &Account) {
      log(message)
    }
  }
`;

export default function FlowScreen() {
  const { user } = useFlowCurrentUser();
  const [txId, setTxId] = useState<string | null>(null);
  const [showSealedAlert, setShowSealedAlert] = useState(false);

  // Query balance using react-native-sdk hook
  const {
    data: balance,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useFlowQuery({
    cadence: GET_BALANCE_SCRIPT,
    args: (arg, t) => [arg(user?.addr ?? "", t.Address)],
    query: {
      enabled: !!user?.loggedIn && !!user?.addr,
    },
  });

  // Mutate hook for sending transactions
  const { mutate: sendTransaction, isPending: isSendingTx } = useFlowMutate();

  // Transaction status hook
  const { transactionStatus: txStatus } = useFlowTransactionStatus({
    id: txId,
  });

  // Show sealed alert when transaction is sealed
  useEffect(() => {
    if (txStatus?.status === 4 && txId && !showSealedAlert) {
      setShowSealedAlert(true);
      Alert.alert("Success", "Transaction sealed on the blockchain!");
      setTxId(null);
      setShowSealedAlert(false);
    }
  }, [txStatus?.status, txId, showSealedAlert]);

  const handleGetBalance = async () => {
    if (!user?.loggedIn) {
      Alert.alert("Error", "Please connect wallet first");
      return;
    }
    refetchBalance();
  };

  const handleSendTransaction = async () => {
    if (!user?.loggedIn) {
      Alert.alert("Error", "Please connect wallet first");
      return;
    }

    const authzService = user.services?.find((s: any) => s.type === "authz");
    if (!authzService) {
      Alert.alert(
        "Error",
        "No authorization service found. Please reconnect wallet."
      );
      return;
    }

    sendTransaction(
      {
        cadence: LOG_MESSAGE_TX,
        args: (arg: any, t: any) => [
          arg("Hello from Expo with react-native-sdk!", t.String),
        ],
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 50,
      },
      {
        onSuccess: (transactionId) => {
          if (transactionId) {
            setTxId(transactionId);
          }
        },
        onError: (error: any) => {
          const message = error?.message || "Unknown error";
          if (
            !message.includes("cancel") &&
            !message.includes("declined") &&
            !message.includes("rejected")
          ) {
            Alert.alert("Transaction Error", message);
          }
        },
      }
    );
  };

  const openFaucet = () => {
    Linking.openURL("https://faucet.flow.com");
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      <ThemedView style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Image
              source={FlowLogo}
              style={styles.flowLogo}
              resizeMode="contain"
            />
            <View style={styles.logoTextContainer}>
              <ThemedText style={styles.flowText}>Flow</ThemedText>
              <ThemedText style={styles.starterText}>Starter</ThemedText>
            </View>
          </View>
          <View style={styles.networkBadge}>
            <ThemedText style={styles.networkText}>
              {currentNetwork.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.stepNumber}>1</ThemedText>
            <ThemedText type="subtitle">Connect Wallet</ThemedText>
          </View>
          <ThemedText style={styles.description}>
            Connect your Flow wallet to interact with the blockchain.
          </ThemedText>

          {/* Using the Connect component from react-native-sdk */}
          <Connect
            onConnect={() => console.log("Connected!")}
            onDisconnect={() => {
              setTxId(null);
              console.log("Disconnected!");
            }}
          />
        </View>

        {currentNetwork === "testnet" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.stepNumber}>2</ThemedText>
              <ThemedText type="subtitle">Get Testnet FLOW</ThemedText>
            </View>
            <ThemedText style={styles.description}>
              Fund your wallet with testnet FLOW tokens from the faucet.
            </ThemedText>
            <Pressable style={styles.secondaryButton} onPress={openFaucet}>
              <ThemedText style={styles.secondaryButtonText}>
                Open Faucet
              </ThemedText>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.stepNumber}>
              {currentNetwork === "testnet" ? "3" : "2"}
            </ThemedText>
            <ThemedText type="subtitle">Query Balance</ThemedText>
          </View>
          <ThemedText style={styles.description}>
            Read your FLOW token balance from the blockchain using a Cadence
            script.
          </ThemedText>
          <Pressable
            style={[
              styles.primaryButton,
              (!user?.loggedIn || isLoadingBalance) && styles.disabledButton,
            ]}
            onPress={handleGetBalance}
            disabled={!user?.loggedIn || isLoadingBalance}
          >
            <ThemedText style={styles.primaryButtonText}>
              {isLoadingBalance ? "Loading..." : "Get Balance"}
            </ThemedText>
          </Pressable>
          {balance !== undefined && balance !== null && (
            <View style={styles.resultContainer}>
              <ThemedText style={styles.resultLabel}>Balance</ThemedText>
              <ThemedText style={styles.resultValue}>
                {String(balance)} FLOW
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.stepNumber}>
              {currentNetwork === "testnet" ? "4" : "3"}
            </ThemedText>
            <ThemedText type="subtitle">Send Transaction</ThemedText>
          </View>
          <ThemedText style={styles.description}>
            Submit a transaction to the blockchain. This will require wallet
            approval.
          </ThemedText>
          <Pressable
            style={[
              styles.primaryButton,
              (!user?.loggedIn || isSendingTx) && styles.disabledButton,
            ]}
            onPress={handleSendTransaction}
            disabled={!user?.loggedIn || isSendingTx}
          >
            <ThemedText style={styles.primaryButtonText}>
              {isSendingTx ? "Sending..." : "Send Transaction"}
            </ThemedText>
          </Pressable>
          {txStatus && (
            <View style={styles.resultContainer}>
              <ThemedText style={styles.resultLabel}>Status</ThemedText>
              <ThemedText style={styles.resultValue}>
                {getStatusName(txStatus.status)}
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flowLogo: {
    width: 40,
    height: 40,
  },
  logoTextContainer: {
    flexDirection: "column",
  },
  flowText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    lineHeight: 20,
  },
  starterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#00EF8B",
    lineHeight: 16,
  },
  networkBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#00EF8B",
    borderRadius: 12,
  },
  networkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(128, 128, 128, 0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#00EF8B",
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: "#00EF8B",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  connectButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  connectedButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#00EF8B",
  },
  connectedButtonText: {
    color: "#00EF8B",
  },
  primaryButton: {
    backgroundColor: "#00EF8B",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00EF8B",
  },
  secondaryButtonText: {
    color: "#00EF8B",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  resultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(0, 239, 139, 0.1)",
    borderRadius: 8,
  },
  resultLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
