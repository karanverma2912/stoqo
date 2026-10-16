import React, { useEffect, useState } from "react";
import {
  Stack,
  router,
  useRootNavigationState,
  useSegments,
} from "expo-router";
import { ActivityIndicator, AppState, View } from "react-native";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useReducedMotion } from "react-native-reanimated";
import { PreferencesProvider, usePreferences } from "../lib/preferences";
import { AuthProvider, useAuth } from "../lib/auth";
import { CartProvider } from "../lib/cart";
import { useNotifications } from "../lib/notifications";
import { useRealtime } from "../lib/realtime";
import { Loading, ErrorBox, Screen, Button, Heading } from "../components/ui";
import { ServerConnection } from "../components/server-connection";
import { ensureServerReady } from "../lib/server-health";
import { apiOrigin } from "../lib/api";
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
  const reducedMotion = useReducedMotion();
  const { ready, user, error, refresh, businesses, signOut } = useAuth(),
    { colors } = usePreferences(),
    segments = useSegments(),
    state = useRootNavigationState();
  const [retrying, setRetrying] = useState(false);
  const section = segments[0] as string;
  const publicSection = [
    "auth",
    "join",
    "verify",
    "reset-password",
    "onboarding",
  ].includes(section);
  // Finish login/invitation redirects before consuming a notification launch.
  useNotifications(
    !!state?.key && !error && segments.length > 0 && !publicSection,
  );
  useRealtime();
  useEffect(() => {
    const warm = () => {
      void ensureServerReady(apiOrigin()).catch(() => {});
    };
    warm();
    const listener = AppState.addEventListener("change", (value) => {
      if (value === "active") warm();
      focusManager.setFocused(value === "active");
    });
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
        <ServerConnection />
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
            void refresh()
              .catch(() => {})
              .finally(() => setRetrying(false));
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
      <ServerConnection safeArea />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: reducedMotion ? "none" : "slide_from_right",
        }}
      />
    </>
  );
}
export default function Layout() {
  const [fontsReady, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  if (!fontsReady && !fontError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F5F5F0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#245A40" />
      </View>
    );
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
