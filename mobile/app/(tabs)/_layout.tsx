import React from "react";
import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { usePreferences } from "../../lib/preferences";
export default function TabsLayout() {
  const { colors, tr } = usePreferences();
  const icon = (glyph: string) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return (
        <Text style={{ color, fontSize: 22, fontWeight: "800" }}>{glyph}</Text>
      );
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: tr("Home"), tabBarIcon: icon("⌂") }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: tr("Inventory"), tabBarIcon: icon("▦") }}
      />
      <Tabs.Screen
        name="sell"
        options={{ title: tr("Sell"), tabBarIcon: icon("+") }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: tr("Ask Stoqo"), tabBarIcon: icon("✦") }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: tr("More"), tabBarIcon: icon("•••") }}
      />
    </Tabs>
  );
}
