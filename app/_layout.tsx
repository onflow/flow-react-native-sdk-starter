import { FlowProviderWrapper } from "@/components/flow-provider-wrapper";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <FlowProviderWrapper>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <StatusBar style="dark" />
    </FlowProviderWrapper>
  );
}
