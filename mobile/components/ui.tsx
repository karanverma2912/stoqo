import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePreferences } from "../lib/preferences";
export function Label({
  children,
  muted = false,
  large = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
}) {
  const { colors, tr } = usePreferences();
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.ink,
        fontSize: large ? 26 : 15,
        fontWeight: large ? "800" : "500",
        lineHeight: large ? 33 : 23,
      }}
    >
      {typeof children === "string" ? tr(children) : children}
    </Text>
  );
}
export function Heading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: 6, marginBottom: 8 }}>
      <Label large>{title}</Label>
      {description && <Label muted>{description}</Label>}
    </View>
  );
}
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { colors } = usePreferences();
  const box = {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 12,
    ...style,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ ...box, opacity: pressed ? 0.8 : 1 })}
    >
      {children}
    </Pressable>
  ) : (
    <View style={box}>{children}</View>
  );
}
export function Button({
  title,
  onPress,
  busy = false,
  disabled = false,
  kind = "primary",
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  kind?: "primary" | "soft" | "danger";
}) {
  const { colors, tr } = usePreferences();
  const primary = kind === "primary",
    bg = primary
      ? colors.primary
      : kind === "danger"
        ? colors.danger
        : colors.soft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 15,
        paddingHorizontal: 18,
        backgroundColor: bg,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        flexDirection: "row",
        gap: 8,
      })}
    >
      {busy ? (
        <ActivityIndicator
          color={primary || kind === "danger" ? colors.onPrimary : colors.ink}
        />
      ) : null}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "800",
          color: primary || kind === "danger" ? colors.onPrimary : colors.ink,
        }}
      >
        {tr(title)}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors, tr } = usePreferences();
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        accessibilityLabel={tr(label)}
        style={[
          {
            color: colors.ink,
            backgroundColor: colors.bg,
            borderRadius: 13,
            minHeight: 49,
            padding: 13,
            borderWidth: 1,
            borderColor: colors.line,
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Pill({
  label,
  onPress,
  active = false,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const { colors, tr } = usePreferences();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.primary : colors.soft,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 30,
        minHeight: 40,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: active ? colors.onPrimary : colors.ink,
          fontSize: 13,
          fontWeight: "700",
        }}
      >
        {tr(label)}
      </Text>
    </Pressable>
  );
}
export function Screen({
  children,
  title,
  back = false,
  scroll = true,
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  scroll?: boolean;
}) {
  const { colors, tr } = usePreferences();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {title && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {back && (
              <Pressable
                accessibilityLabel={tr("Back")}
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/(tabs)")
                }
                style={{
                  padding: 10,
                  borderRadius: 15,
                  backgroundColor: colors.soft,
                }}
              >
                <Text style={{ fontSize: 21, color: colors.ink }}>‹</Text>
              </Pressable>
            )}
            <Text
              style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}
            >
              {tr(title)}
            </Text>
          </View>
        )}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 40,
              gap: 17,
              flexGrow: 1,
            }}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 20, gap: 16 }}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function ErrorBox({ message }: { message?: string }) {
  const { colors } = usePreferences();
  return message ? (
    <View
      accessibilityRole="alert"
      style={{
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.danger,
      }}
    >
      <Text style={{ color: colors.danger, lineHeight: 22 }}>{message}</Text>
    </View>
  ) : null;
}
export function Loading() {
  const { colors } = usePreferences();
  return (
    <View style={{ padding: 30, alignItems: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {children}
    </View>
  );
}
export function FadeIn({ children }: { children: React.ReactNode }) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [value]);
  return (
    <Animated.View
      style={{
        opacity: value,
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
        gap: 17,
      }}
    >
      {children}
    </Animated.View>
  );
}
export function confirm(
  title: string,
  message: string,
  action: () => void,
  destructive = false,
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Confirm",
      style: destructive ? "destructive" : "default",
      onPress: action,
    },
  ]);
}
export const styles = StyleSheet.create({
  split: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  grow: { flex: 1 },
  grid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
});
