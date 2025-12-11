import { FlowProviderWrapper } from "@/components/flow-provider-wrapper";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <FlowProviderWrapper>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </FlowProviderWrapper>
  );
}
