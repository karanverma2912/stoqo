import React, { useEffect, useState } from "react";
import {
  Stack,
  router,
  useRootNavigationState,
  useSegments,
} from "expo-router";
import { AppState } from "react-native";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PreferencesProvider, usePreferences } from "../lib/preferences";
import { AuthProvider, useAuth } from "../lib/auth";
import { CartProvider } from "../lib/cart";
import { useNotifications } from "../lib/notifications";
import { useRealtime } from "../lib/realtime";
import { Loading, ErrorBox, Screen, Button, Heading } from "../components/ui";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});
function Navigation() {
  const { ready, user, error, refresh, businesses, signOut } = useAuth(),
    { colors } = usePreferences(),
    segments = useSegments(),
    state = useRootNavigationState();
  const [retrying, setRetrying] = useState(false);
  const section = segments[0] as string;
  const publicSection = ["auth", "join", "verify", "reset-password", "onboarding"].includes(section);
  // Finish login/invitation redirects before consuming a notification launch.
  useNotifications(!!state?.key && !error && segments.length > 0 && !publicSection);
  useRealtime();
  useEffect(() => {
    const listener = AppState.addEventListener("change", (value) =>
      focusManager.setFocused(value === "active"),
    );
    return () => listener.remove();
  }, []);
  const signedIn = !!user;
  useEffect(() => {
    if (!ready || !state?.key || error) return;
    const publicRoutes = ["auth", "join", "verify", "reset-password"];
    if (!signedIn && !publicRoutes.includes(section)) router.replace("/auth");
    else if (
      signedIn &&
      businesses.length === 0 &&
      !publicRoutes.includes(section) &&
      section !== "onboarding"
    )
      router.replace("/onboarding");
  }, [ready, signedIn, businesses.length, state?.key, section, error]);
  if (!ready)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <Heading
          title="Reconnect to your store"
          description="Your saved login is still here. Retry when your connection is ready."
        />
        <ErrorBox message={error} />
        <Button
          title="Retry"
          busy={retrying}
          onPress={() => {
            setRetrying(true);
            void refresh().catch(() => {}).finally(() => setRetrying(false));
          }}
        />
        <Button
          title="Use another account"
          kind="soft"
          disabled={retrying}
          onPress={() => void signOut().catch(() => {})}
        />
      </Screen>
    );
  return (
    <>
      <StatusBar style={colors.bg === "#0A1610" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <AuthProvider>
            <CartProvider>
              <Navigation />
            </CartProvider>
          </AuthProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
