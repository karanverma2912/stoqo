import React, { useSyncExternalStore } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { connectionSnapshot, subscribeConnection } from "../lib/server-health";
import { usePreferences } from "../lib/preferences";
import { Label } from "./ui";
export function ServerConnection({ safeArea = false }: { safeArea?: boolean }) {
  const status = useSyncExternalStore(
    subscribeConnection,
    connectionSnapshot,
    connectionSnapshot,
  );
  const { colors } = usePreferences();
  if (status !== "slow") return null;
  return (
    <SafeAreaView
      edges={safeArea ? ["top", "left", "right"] : []}
      style={{ backgroundColor: colors.soft, padding: 12 }}
    >
      <Label size={12} accessibilityLiveRegion="polite">
        Connecting to your store… The server may need a moment to wake up.
      </Label>
    </SafeAreaView>
  );
}
