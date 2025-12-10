import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";

const FlowLogo = require("@/assets/flow.png");

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00EF8B",
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Image
              source={FlowLogo}
              style={[styles.tabIcon, !focused && styles.tabIconInactive]}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 28,
    height: 28,
  },
  tabIconInactive: {
    opacity: 0.5,
  },
});
