import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { currentNetwork } from "@/config/flow";
import * as fcl from "@onflow/fcl-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

export default function FlowScreen() {
  const [user, setUser] = useState<any>({ loggedIn: null });
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [scriptResult, setScriptResult] = useState<string>("");
  const [txStatus, setTxStatus] = useState<string>("");

  const txUnsubscribeRef = useRef<(() => void) | null>(null);

  const cleanupTxSubscription = () => {
    if (txUnsubscribeRef.current) {
      txUnsubscribeRef.current();
      txUnsubscribeRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupTxSubscription();
  }, []);

  useEffect(() => {
    const unsubscribe = fcl.currentUser.subscribe((userData: any) => {
      setUser(userData);
      if (!initialized) {
        setInitialized(true);
      }
    });
    return () => unsubscribe();
  }, [initialized]);

  const handleConnect = async () => {
    try {
      await fcl.authenticate();
    } catch (error: any) {
      if (error.message !== "User cancelled authentication") {
        Alert.alert("Authentication Error", error.message);
      }
    }
  };

  const handleDisconnect = async () => {
    cleanupTxSubscription();
    await fcl.unauthenticate();
    setScriptResult("");
    setTxStatus("");
  };

  const handleGetBalance = async () => {
    if (!user.loggedIn) {
      Alert.alert("Error", "Please connect wallet first");
      return;
    }

    setIsLoading(true);
    setScriptResult("");

    try {
      const result = await fcl.query({
        cadence: `
          import FlowToken from 0x7e60df042a9c0868
          import FungibleToken from 0x9a0766d93b6608b7

          access(all) fun main(address: Address): UFix64 {
            let account = getAccount(address)
            let vaultRef = account.capabilities
              .borrow<&FlowToken.Vault>(/public/flowTokenBalance)
              ?? panic("Could not borrow Balance reference to the Vault")

            return vaultRef.balance
          }
        `,
        args: (arg: any, t: any) => [arg(user.addr, t.Address)],
      });

      setScriptResult(`${result} FLOW`);
    } catch (error: any) {
      Alert.alert("Script Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!user.loggedIn) {
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

    cleanupTxSubscription();
    setIsSendingTx(true);
    setTxStatus("Sending...");

    try {
      const transactionId = await fcl.mutate({
        cadence: `
          transaction(message: String) {
            prepare(signer: &Account) {
              log(message)
            }
          }
        `,
        args: (arg: any, t: any) => [arg("Hello from Expo!", t.String)],
        payer: fcl.authz as any,
        proposer: fcl.authz as any,
        authorizations: [fcl.authz as any],
        limit: 50,
      });

      if (!transactionId) {
        setTxStatus("");
        setIsSendingTx(false);
        return;
      }

      setTxStatus(`Submitted: ${transactionId.slice(0, 8)}...`);
      setIsSendingTx(false);

      txUnsubscribeRef.current = fcl.tx(transactionId).subscribe((res: any) => {
        setTxStatus(`${getStatusName(res.status)}`);

        if (res.status === 4) {
          Alert.alert("Success", "Transaction sealed on the blockchain!");
          cleanupTxSubscription();
        }
      });
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      if (
        !message.includes("cancel") &&
        !message.includes("declined") &&
        !message.includes("rejected")
      ) {
        Alert.alert("Transaction Error", message);
      }
      setTxStatus("");
      setIsSendingTx(false);
      cleanupTxSubscription();
    }
  };

  const openFaucet = () => {
    Linking.openURL("https://faucet.flow.com");
  };

  if (!initialized) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Initializing...</ThemedText>
      </ThemedView>
    );
  }

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

          {user.loggedIn ? (
            <View style={styles.connectedContainer}>
              <View style={styles.addressContainer}>
                <ThemedText style={styles.addressLabel}>Connected</ThemedText>
                <Text selectable style={styles.address}>
                  {user.addr}
                </Text>
              </View>
              <Pressable
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <ThemedText style={styles.disconnectText}>
                  Disconnect
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleConnect}>
              <ThemedText style={styles.primaryButtonText}>
                Connect Wallet
              </ThemedText>
            </Pressable>
          )}
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
              !user.loggedIn && styles.disabledButton,
            ]}
            onPress={handleGetBalance}
            disabled={!user.loggedIn || isLoading}
          >
            <ThemedText style={styles.primaryButtonText}>
              Get Balance
            </ThemedText>
          </Pressable>
          {scriptResult && (
            <View style={styles.resultContainer}>
              <ThemedText style={styles.resultLabel}>Balance</ThemedText>
              <ThemedText style={styles.resultValue}>{scriptResult}</ThemedText>
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
              (!user.loggedIn || isSendingTx) && styles.disabledButton,
            ]}
            onPress={handleSendTransaction}
            disabled={!user.loggedIn || isSendingTx}
          >
            <ThemedText style={styles.primaryButtonText}>
              {isSendingTx ? "Sending..." : "Send Transaction"}
            </ThemedText>
          </Pressable>
          {txStatus && (
            <View style={styles.resultContainer}>
              <ThemedText style={styles.resultLabel}>Status</ThemedText>
              <ThemedText style={styles.resultValue}>{txStatus}</ThemedText>
            </View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#00EF8B" />
          </View>
        )}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.6,
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
  connectedContainer: {
    gap: 12,
  },
  addressContainer: {
    padding: 12,
    backgroundColor: "rgba(0, 239, 139, 0.1)",
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  address: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#11181C",
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
  disconnectButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  disconnectText: {
    color: "#ff4444",
    fontSize: 14,
    fontWeight: "500",
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
  loadingOverlay: {
    position: "absolute",
    top: 20,
    right: 20,
  },
});
