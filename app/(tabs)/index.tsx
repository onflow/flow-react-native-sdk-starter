import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  clientPromise,
  currentNetwork,
  sessionCleanupPromise,
} from "@/config/flow";
import * as fcl from "@onflow/fcl-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
} from "react-native";

// Helper function to get transaction status name
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
  const [isLoading, setIsLoading] = useState(false);
  const [scriptResult, setScriptResult] = useState<string>("");
  const [txStatus, setTxStatus] = useState<string>("");
  const [initTimeout, setInitTimeout] = useState(false);
  const [cleanupComplete, setCleanupComplete] = useState(false);

  // Subscribe to authentication state
  useEffect(() => {
    // Wait for session cleanup before subscribing to avoid UI flicker
    sessionCleanupPromise.then(() => {
      console.log("Session cleanup complete, ready to subscribe");
      setCleanupComplete(true);
    });

    const unsubscribe = fcl.currentUser.subscribe((userData: any) => {
      console.log("Auth state changed:", {
        loggedIn: userData.loggedIn,
        addr: userData.addr,
        services: userData.services?.map((s: any) => s.type),
      });

      // Only update user state after cleanup is complete to avoid flicker
      if (cleanupComplete || !userData.loggedIn) {
        setUser(userData);
      }
    });

    // Set timeout to force show UI after 3 seconds even if still initializing
    const timeout = setTimeout(() => {
      setInitTimeout(true);
      setCleanupComplete(true); // Force cleanup complete on timeout
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [cleanupComplete]);

  // Function: Disconnect Wallet
  const handleDisconnect = async () => {
    console.log("Disconnecting wallet...");

    try {
      // Get the WalletConnect client from the imported clientPromise
      const client = await clientPromise;

      if (client) {
        // Get all sessions and disconnect them
        const sessions = client.session.getAll();
        console.log(`Disconnecting ${sessions.length} WalletConnect session(s)`);

        for (const session of sessions) {
          console.log(`  -> Disconnecting session: ${session.topic}`);
          await client.disconnect({
            topic: session.topic,
            reason: {
              code: 6000,
              message: "User disconnected",
            },
          });
        }
      }
    } catch (error) {
      console.error("Error disconnecting WalletConnect sessions:", error);
    }

    // Unauthenticate from FCL (clears user state)
    await fcl.unauthenticate();
    console.log("Wallet disconnected successfully");

    setScriptResult("");
    setTxStatus("");
  };

  // Function: Execute Script (Read blockchain)
  const handleExecuteScript = async () => {
    if (!user.loggedIn) {
      Alert.alert("Error", "Please connect wallet first");
      return;
    }

    console.log("Executing script to get Flow token balance");
    console.log(`  -> Address: ${user.addr}`);

    setIsLoading(true);
    setScriptResult("");

    try {
      // Simple script to get Flow token balance
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

      console.log("Script executed successfully");
      console.log(`  -> Balance: ${result} FLOW`);

      setScriptResult(`Balance: ${result} FLOW`);
    } catch (error: any) {
      console.error("Script error:", error);
      Alert.alert("Script Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function: Send Transaction (Write blockchain)
  const handleSendTransaction = async () => {
    if (!user.loggedIn) {
      Alert.alert("Error", "Please connect wallet first");
      return;
    }

    // Check if user has authz service
    const authzService = user.services?.find((s: any) => s.type === "authz");
    if (!authzService) {
      console.error("No authorization service found");
      Alert.alert(
        "Error",
        "No authorization service found. Please reconnect wallet."
      );
      return;
    }

    console.log("Sending transaction...");
    console.log(`  -> Message: "Hello from Expo!"`);
    console.log(`  -> Proposer: ${user.addr}`);
    console.log(`  -> Payer: ${user.addr}`);

    setIsLoading(true);
    setTxStatus("Sending transaction...");

    try {
      // Simple transaction to log a message
      console.log("Calling fcl.mutate...");
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

      console.log("fcl.mutate completed!");
      console.log("Transaction sent!");
      console.log(`  -> Transaction ID: ${transactionId}`);

      setTxStatus(`Transaction sent! ID: ${transactionId}`);

      // Subscribe to transaction status
      const unsub = fcl.tx(transactionId).subscribe((res: any) => {
        console.log(`Transaction status: ${res.status} (${getStatusName(res.status)})`);
        setTxStatus(`Status: ${res.status}`);

        if (res.status === 4) {
          // SEALED
          console.log("Transaction sealed!");
          setTxStatus("Transaction Sealed!");
          Alert.alert("Success", "Transaction completed!");
          unsub();
        }
      });
    } catch (error: any) {
      console.error("Transaction error:", error);
      Alert.alert("Transaction Error", error.message);
      setTxStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state only if not timed out
  if (user.loggedIn === null && !initTimeout) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  // Show authentication UI if not logged in
  if (!user.loggedIn) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Flow Expo Starter
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Select a wallet to connect
        </ThemedText>
        <ThemedText style={styles.networkBadge}>
          Network: {currentNetwork.toUpperCase()}
        </ThemedText>

        <fcl.ServiceDiscovery fcl={fcl} />
      </ThemedView>
    );
  }

  // Show connected state with features
  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Flow Expo Starter
        </ThemedText>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Connected Wallet</ThemedText>
          <ThemedText style={styles.networkBadge}>
            Network: {currentNetwork.toUpperCase()}
          </ThemedText>
          <ThemedText style={styles.address}>{user.addr}</ThemedText>
          <Button
            title="Disconnect"
            onPress={handleDisconnect}
            color="#ff4444"
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">1. Execute Script</ThemedText>
          <ThemedText style={styles.description}>
            Read your Flow token balance from the blockchain
          </ThemedText>
          <Button
            title="Get Balance"
            onPress={handleExecuteScript}
            disabled={isLoading}
          />
          {scriptResult && (
            <ThemedView style={styles.result}>
              <ThemedText>{scriptResult}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">2. Send Transaction</ThemedText>
          <ThemedText style={styles.description}>
            Send a simple transaction to the blockchain
          </ThemedText>
          <Button
            title="Send Transaction"
            onPress={handleSendTransaction}
            disabled={isLoading}
          />
          {txStatus && (
            <ThemedView style={styles.result}>
              <ThemedText>{txStatus}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  networkBadge: {
    textAlign: "center",
    marginBottom: 10,
    padding: 8,
    backgroundColor: "rgba(0, 122, 255, 0.2)",
    borderRadius: 5,
    fontWeight: "bold",
  },
  buttonContainer: {
    marginTop: 20,
  },
  section: {
    marginVertical: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  address: {
    fontFamily: "monospace",
    marginVertical: 10,
    fontSize: 12,
  },
  description: {
    marginBottom: 10,
    opacity: 0.7,
    fontSize: 14,
  },
  result: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(0, 255, 0, 0.1)",
    borderRadius: 5,
  },
  loader: {
    marginTop: 20,
  },
});
