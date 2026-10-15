import React from "react";
import { Tabs } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { usePreferences } from "../../lib/preferences";
import { WorkspaceTabBar } from "../../components/workspace-tab-bar";
export default function TabsLayout() {
  const reducedMotion = useReducedMotion();
  const { tr } = usePreferences();
  return (
    <Tabs
      tabBar={(props) => <WorkspaceTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? "none" : "fade",
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr("Home") }} />
      <Tabs.Screen name="inventory" options={{ title: tr("Inventory") }} />
      <Tabs.Screen name="sell" options={{ title: tr("Sell") }} />
      <Tabs.Screen name="assistant" options={{ title: tr("Assistant") }} />
      <Tabs.Screen name="more" options={{ title: tr("Workspace") }} />
    </Tabs>
  );
}
