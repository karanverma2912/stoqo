import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Text, type ColorValue } from "react-native";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { usePreferences } from "../../lib/preferences";
import { useAuth } from "../../lib/auth";
import { useRealtime } from "../../lib/realtime";
export default function TabsLayout() {
  const { colors, tr } = usePreferences(),
    { business, businesses, selectBusiness } = useAuth(),
    cache = useQueryClient();
  useRealtime();
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(
      () => void cache.invalidateQueries(),
    );
    const tapped = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = Number(
          response.notification.request.content.data?.business_id,
        );
        if (businesses.some((b) => b.id === id))
          void selectBusiness(id).then(() => router.push("/notifications"));
      },
    );
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const id = Number(
          response.notification.request.content.data?.business_id,
        );
        if (business?.id === id) router.push("/notifications");
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [businesses.map((b) => b.id).join(",")]);
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
