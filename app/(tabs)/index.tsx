import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  Connect,
  useFlowConfig,
  useFlowCurrentUser,
  useFlowMutate,
  useFlowQuery,
} from "@onflow/react-native-sdk";
import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

const FlowLogo = require("@/assets/flow.png");

// Contract addresses per network
const CONTRACT_ADDRESSES: Record<string, Record<string, string>> = {
  testnet: {
    FungibleToken: "0x9a0766d93b6608b7",
    FlowToken: "0x7e60df042a9c0868",
  },
  mainnet: {
    FungibleToken: "0xf233dcee88fe0abe",
    FlowToken: "0x1654653399040a61",
  },
};

// Cadence script to get FLOW balance
const FLOW_BALANCE_SCRIPT = `
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    let vaultRef = account.capabilities
        .get<&FlowToken.Vault>(/public/flowTokenBalance)
        .borrow()
        ?? panic("Could not borrow Balance reference to the Vault")
    return vaultRef.balance
}
`;

// Cadence transaction to transfer FLOW
const TRANSFER_FLOW_TRANSACTION = `
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

transaction(amount: UFix64, to: Address) {
    let vault: @{FungibleToken.Vault}

    prepare(signer: auth(BorrowValue) &Account) {
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow reference to the owner's Vault!")

        self.vault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        let recipient = getAccount(to)
        let receiverRef = recipient.capabilities
            .get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            .borrow()
            ?? panic("Could not borrow receiver reference to the recipient's Vault")

        receiverRef.deposit(from: <-self.vault)
    }
}
`;

export default function FlowScreen() {
  const { user } = useFlowCurrentUser();
  const { flowNetwork } = useFlowConfig();
  const address = user?.addr;
  const network = flowNetwork || "testnet";
  const isTestnet = network === "testnet";

  // Ensure address has 0x prefix
  const formattedAddress = address
    ? address.startsWith("0x")
      ? address
      : `0x${address}`
    : "";

  // Replace contract address placeholders in script
  const balanceScript = FLOW_BALANCE_SCRIPT.replace(
    /0xFungibleToken/g,
    CONTRACT_ADDRESSES[network]?.FungibleToken ||
      CONTRACT_ADDRESSES.testnet.FungibleToken
  ).replace(
    /0xFlowToken/g,
    CONTRACT_ADDRESSES[network]?.FlowToken ||
      CONTRACT_ADDRESSES.testnet.FlowToken
  );

  // Replace contract address placeholders in transaction
  const transferTransaction = TRANSFER_FLOW_TRANSACTION.replace(
    /0xFungibleToken/g,
    CONTRACT_ADDRESSES[network]?.FungibleToken ||
      CONTRACT_ADDRESSES.testnet.FungibleToken
  ).replace(
    /0xFlowToken/g,
    CONTRACT_ADDRESSES[network]?.FlowToken ||
      CONTRACT_ADDRESSES.testnet.FlowToken
  );

  // Query balance using useFlowQuery hook
  const {
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useFlowQuery({
    cadence: balanceScript,
    args: (arg, t) => [arg(formattedAddress, t.Address)],
  });

  // Mutate hook for sending transactions
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { mutate, isPending, isSuccess, error, data: txId } = useFlowMutate();

  const handleSend = () => {
    if (!recipient || !amount) {
      return;
    }
    // Convert amount to proper decimal format (UFix64 requires decimal notation)
    const formattedAmount = parseFloat(amount).toFixed(8);
    // Ensure recipient address has 0x prefix
    const formattedRecipient = recipient.startsWith("0x")
      ? recipient
      : `0x${recipient}`;
    mutate({
      cadence: transferTransaction,
      args: (arg: any, t: any) => [
        arg(formattedAmount, t.UFix64),
        arg(formattedRecipient, t.Address),
      ],
    });
  };

  const openFaucet = () => {
    Linking.openURL("https://faucet.flow.com/fund-account");
  };

  const openFlowscan = (transactionId: string) => {
    const baseUrl =
      network === "mainnet"
        ? "https://flowscan.io"
        : "https://testnet.flowscan.io";
    Linking.openURL(`${baseUrl}/transaction/${transactionId}`);
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
              {network.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Step 1: Connect Wallet */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.stepNumber}>1</ThemedText>
            <ThemedText type="subtitle">Connect Wallet</ThemedText>
          </View>
          <ThemedText style={styles.description}>
            Connect your Flow wallet to interact with the blockchain.
          </ThemedText>
          <Connect />
        </View>

        {/* Step 2: Get Testnet Funds (testnet only) */}
        {isTestnet && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.stepNumber}>2</ThemedText>
              <ThemedText type="subtitle">Get Testnet Funds</ThemedText>
            </View>
            <ThemedText style={styles.description}>
              Fund your wallet with testnet FLOW tokens from the faucet.
            </ThemedText>
            {address ? (
              <View style={styles.addressContainer}>
                <ThemedText style={styles.addressText} numberOfLines={1}>
                  {address}
                </ThemedText>
                <Pressable style={styles.secondaryButton} onPress={openFaucet}>
                  <ThemedText style={styles.secondaryButtonText}>
                    Open Faucet
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <ThemedText style={styles.placeholderText}>
                  Connect your wallet to see your address
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Check Balance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.stepNumber}>
              {isTestnet ? "3" : "2"}
            </ThemedText>
            <ThemedText type="subtitle">Check Balance</ThemedText>
          </View>
          <ThemedText style={styles.description}>
            Query your FLOW token balance using useFlowQuery
          </ThemedText>
          {!address ? (
            <View style={styles.placeholderBox}>
              <ThemedText style={styles.placeholderText}>
                Connect your wallet to see balance
              </ThemedText>
            </View>
          ) : isLoadingBalance ? (
            <View style={styles.loadingBox}>
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            </View>
          ) : balanceError ? (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>
                Error loading balance
              </ThemedText>
            </View>
          ) : (
            <View>
              <View style={styles.balanceBox}>
                <ThemedText style={styles.balanceLabel}>Balance</ThemedText>
                <ThemedText style={styles.balanceValue}>
                  {balance ? String(balance) : "0.00"}
                </ThemedText>
                <ThemedText style={styles.balanceUnit}>FLOW</ThemedText>
              </View>
              <Pressable
                style={styles.primaryButton}
                onPress={() => refetchBalance()}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Refresh
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {/* Step 4: Send FLOW */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.stepNumber}>
              {isTestnet ? "4" : "3"}
            </ThemedText>
            <ThemedText type="subtitle">Send FLOW</ThemedText>
          </View>
          <ThemedText style={styles.description}>
            Transfer tokens using useFlowMutate
          </ThemedText>
          {!address ? (
            <View style={styles.placeholderBox}>
              <ThemedText style={styles.placeholderText}>
                Connect your wallet to send FLOW
              </ThemedText>
            </View>
          ) : (
            <View>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>
                  Recipient Address
                </ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={recipient}
                  onChangeText={setRecipient}
                  placeholder="0x..."
                  placeholderTextColor="rgba(0, 0, 0, 0.3)"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Amount (FLOW)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={amount}
                  onChangeText={(value) => {
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  placeholder="0.00"
                  placeholderTextColor="rgba(0, 0, 0, 0.3)"
                  keyboardType="decimal-pad"
                />
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  styles.sendButton,
                  (isPending || !recipient || !amount) && styles.disabledButton,
                ]}
                onPress={handleSend}
                disabled={isPending || !recipient || !amount}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isPending ? "Sending..." : "Send FLOW"}
                </ThemedText>
              </Pressable>

              {isSuccess && txId && (
                <View style={styles.successBox}>
                  <ThemedText style={styles.successText}>
                    Transaction successful!
                  </ThemedText>
                  <Pressable onPress={() => openFlowscan(txId as string)}>
                    <ThemedText style={styles.linkText}>
                      View on FlowScan
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <ThemedText style={styles.errorText}>
                    Transaction failed. Please try again.
                  </ThemedText>
                </View>
              )}
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
  placeholderBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  placeholderText: {
    fontSize: 14,
    opacity: 0.5,
  },
  loadingBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
  },
  successBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  successText: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  linkText: {
    fontSize: 12,
    color: "#22c55e",
    textDecorationLine: "underline",
  },
  balanceBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 239, 139, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 239, 139, 0.2)",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  balanceUnit: {
    fontSize: 14,
    opacity: 0.4,
    marginTop: 4,
  },
  addressContainer: {
    gap: 12,
  },
  addressText: {
    fontSize: 12,
    fontFamily: "monospace",
    opacity: 0.7,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
    marginBottom: 8,
  },
  textInput: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    fontSize: 14,
    color: "#000",
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
  sendButton: {
    backgroundColor: "#ec4899",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
