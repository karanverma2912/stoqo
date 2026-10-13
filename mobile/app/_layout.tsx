import React, { useEffect } from "react";
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
import { Loading, ErrorBox, Screen, Button } from "../components/ui";
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
  const { ready, user, error, refresh, businesses } = useAuth(),
    { colors, theme } = usePreferences(),
    segments = useSegments(),
    state = useRootNavigationState();
  useEffect(() => {
    const listener = AppState.addEventListener("change", (value) =>
      focusManager.setFocused(value === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!ready || !state?.key) return;
    const publicRoutes = ["auth", "join", "verify", "reset-password"];
    const section = segments[0] as string;
    if (!user && !publicRoutes.includes(section)) router.replace("/auth");
    else if (
      user &&
      businesses.length === 0 &&
      !publicRoutes.includes(section) &&
      section !== "onboarding"
    )
      router.replace("/onboarding");
  }, [ready, user?.id, businesses.length, state?.key, segments.join("/")]);
  if (!ready)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (error && user)
    return (
      <Screen>
        <ErrorBox message={error} />
        <Button title="Retry" onPress={() => void refresh().catch(() => {})} />
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
