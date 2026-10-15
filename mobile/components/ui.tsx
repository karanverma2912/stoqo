import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import { usePreferences } from "../lib/preferences";
import { typeface, type FontWeight } from "../lib/typography";
import { Icon, type IconName } from "./icon";
import { Motion, Tap } from "./motion";
export { Icon, Motion, Tap };

export function Label({
  children,
  muted = false,
  large = false,
  size,
  weight,
  color,
  style,
  ...props
}: TextProps & {
  muted?: boolean;
  large?: boolean;
  size?: number;
  weight?: FontWeight;
  color?: string;
}) {
  return (
    <TranslatedText
      {...props}
      size={size ?? (large ? 29 : 14)}
      weight={weight ?? (large ? "extra" : "medium")}
      color={color}
      muted={muted}
      style={style}
    >
      {children}
    </TranslatedText>
  );
}
function TranslatedText({
  children,
  size,
  weight,
  color,
  muted,
  style,
  ...props
}: TextProps & {
  size: number;
  weight: FontWeight;
  color?: string;
  muted?: boolean;
}) {
  const { colors, tr } = usePreferences();
  return (
    <Text
      {...props}
      style={[
        {
          color: color ?? (muted ? colors.muted : colors.ink),
          fontSize: size,
          lineHeight: Math.round(size * 1.45),
          ...typeface(weight),
        },
        style,
      ]}
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
    <View style={{ gap: 5, marginBottom: 3 }}>
      <Label large style={{ letterSpacing: -1 }}>
        {title}
      </Label>
      {description ? <Label muted>{description}</Label> : null}
    </View>
  );
}
export function Brand({
  inverted = false,
  compact = false,
}: {
  inverted?: boolean;
  compact?: boolean;
}) {
  const { colors } = usePreferences();
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: inverted ? colors.accent : colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name="box"
          size={23}
          color={inverted ? colors.hero : colors.onPrimary}
        />
      </View>
      {!compact ? (
        <Label
          size={29}
          weight="extra"
          color={inverted ? colors.heroInk : colors.ink}
          style={{ letterSpacing: -1.7 }}
        >
          stoqo.
        </Label>
      ) : null}
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
  const box: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 19,
    gap: 12,
    shadowColor: "#142E20",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.025,
    shadowRadius: 16,
    ...style,
  };
  return onPress ? (
    <Tap accessibilityRole="button" onPress={onPress} style={box}>
      {children}
    </Tap>
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
  icon,
  trailingIcon,
  compact = false,
  style,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  kind?: "primary" | "soft" | "danger" | "accent";
  icon?: IconName;
  trailingIcon?: IconName;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const { colors, tr } = usePreferences();
  const color =
    kind === "accent"
      ? colors.hero
      : kind === "soft"
        ? colors.ink
        : colors.onPrimary;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={tr(title)}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={{
        minHeight: compact ? 43 : 55,
        paddingVertical: 11,
        paddingHorizontal: compact ? 14 : 20,
        borderRadius: 17,
        backgroundColor:
          kind === "accent"
            ? colors.accent
            : kind === "primary"
              ? colors.primary
              : kind === "danger"
                ? colors.danger
                : colors.soft,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 9,
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {busy ? (
        <ActivityIndicator color={color} size="small" />
      ) : icon ? (
        <Icon name={icon} size={19} color={color} />
      ) : null}
      <Label
        weight="bold"
        size={14}
        color={color}
        style={{ flexShrink: 1, textAlign: "center" }}
      >
        {title}
      </Label>
      {trailingIcon && !busy ? (
        <Icon name={trailingIcon} size={19} color={color} />
      ) : null}
    </Tap>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
  kind = "soft",
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  kind?: "soft" | "primary" | "bare";
}) {
  const { colors, tr } = usePreferences();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={tr(label)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 46,
        height: 46,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
          kind === "primary"
            ? colors.primary
            : kind === "bare"
              ? "transparent"
              : colors.soft,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon
        name={name}
        color={kind === "primary" ? colors.onPrimary : colors.ink}
      />
    </Tap>
  );
}
export function Field({
  label,
  error,
  hint,
  secureTextEntry,
  icon,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  icon?: IconName;
}) {
  const { colors, tr } = usePreferences();
  const [passwordVisible, setPasswordVisible] = useState(false),
    [focused, setFocused] = useState(false);
  const leading = icon ?? (secureTextEntry ? "lock" : undefined);
  return (
    <View style={{ gap: 8 }}>
      <Label
        size={12}
        weight="bold"
        style={{ marginLeft: 2, letterSpacing: 0.15 }}
      >
        {label}
      </Label>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          {...props}
          secureTextEntry={secureTextEntry && !passwordVisible}
          placeholderTextColor={colors.muted}
          accessibilityLabel={error ? `${tr(label)}. ${tr(error)}` : tr(label)}
          accessibilityHint={
            props.accessibilityHint ?? (hint ? tr(hint) : undefined)
          }
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            {
              color: colors.ink,
              backgroundColor: focused ? colors.card : colors.bg,
              borderRadius: 16,
              minHeight: 55,
              padding: 15,
              borderWidth: 1.2,
              borderColor: focused ? colors.primary : colors.line,
              fontSize: 15,
              ...typeface("medium"),
            },
            props.style,
            leading ? { paddingLeft: 45 } : undefined,
            secureTextEntry ? { paddingRight: 55 } : undefined,
            error ? { borderColor: colors.danger } : undefined,
          ]}
        />
        {leading ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 15 }}>
            <Icon
              name={leading}
              size={19}
              color={focused ? colors.primary : colors.muted}
            />
          </View>
        ) : null}
        {secureTextEntry ? (
          <Tap
            accessibilityRole="button"
            accessibilityLabel={tr(
              passwordVisible ? "Hide password" : "Show password",
            )}
            disabled={props.editable === false}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={{
              position: "absolute",
              right: 5,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name={passwordVisible ? "eyeOff" : "eye"}
              size={21}
              color={colors.muted}
            />
          </Tap>
        ) : null}
      </View>
      {error ? (
        <Label
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          size={12}
          color={colors.danger}
        >
          {error}
        </Label>
      ) : hint ? (
        <Label size={12} muted>
          {hint}
        </Label>
      ) : null}
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
  const { colors } = usePreferences();
  return (
    <Tap
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 13,
        minHeight: 42,
        justifyContent: "center",
        backgroundColor: active ? colors.primary : colors.soft,
      }}
    >
      <Label
        size={12}
        weight="bold"
        color={active ? colors.onPrimary : colors.ink}
      >
        {label}
      </Label>
    </Tap>
  );
}
export function Segmented({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { colors } = usePreferences();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(
      withTiming(index, {
        duration: 240,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [index, position]);
  const indicator = useAnimatedStyle(() => ({
    transform: [
      { translateX: position.get() * ((width - 8) / options.length) },
    ],
  }));
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        backgroundColor: colors.soft,
        padding: 4,
        borderRadius: 17,
        flexDirection: "row",
        minHeight: 52,
      }}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 4,
              bottom: 4,
              left: 4,
              width: (width - 8) / options.length,
              backgroundColor: colors.card,
              borderRadius: 13,
              shadowColor: "#173F2E",
              shadowOpacity: 0.07,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
            },
            indicator,
          ]}
        />
      ) : null}
      {options.map((option) => (
        <Tap
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value, disabled }}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Label
            size={12}
            weight="bold"
            color={value === option.value ? colors.ink : colors.muted}
          >
            {option.label}
          </Label>
        </Tap>
      ))}
    </View>
  );
}
export function Screen({
  children,
  title,
  back = false,
  scroll = true,
  padding = 22,
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  scroll?: boolean;
  padding?: number;
}) {
  const { colors } = usePreferences();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {title ? (
          <View
            style={{
              paddingHorizontal: 22,
              paddingTop: 10,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {back ? (
              <IconButton
                name="back"
                label="Back"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/(tabs)")
                }
              />
            ) : null}
            <Label
              size={22}
              weight="extra"
              style={{ flex: 1, letterSpacing: -0.7 }}
            >
              {title}
            </Label>
          </View>
        ) : null}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              padding,
              paddingTop: 15,
              paddingBottom: 35,
              gap: 19,
              flexGrow: 1,
            }}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              paddingHorizontal: padding,
              paddingTop: 15,
              gap: 18,
            }}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function ErrorBox({ message }: { message?: string }) {
  const { colors } = usePreferences();
  return message ? (
    <Motion>
      <View
        accessibilityRole="alert"
        style={{
          padding: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.danger,
          flexDirection: "row",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Icon name="warning" color={colors.danger} size={19} />
        <Label color={colors.danger} style={{ flex: 1 }} size={13}>
          {message}
        </Label>
      </View>
    </Motion>
  ) : null;
}
export function Loading() {
  const { colors } = usePreferences();
  return (
    <View
      accessibilityLabel="Loading"
      style={{ padding: 30, alignItems: "center", gap: 10 }}
    >
      <ActivityIndicator color={colors.primary} />
      <Label muted size={12}>
        Getting things ready…
      </Label>
    </View>
  );
}
export function EmptyState({
  icon = "box",
  title,
  description,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = usePreferences();
  return (
    <Motion>
      <View
        style={{
          padding: 26,
          paddingVertical: 35,
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 26,
            backgroundColor: colors.soft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <Icon name={icon} size={32} color={colors.primary} />
        </View>
        <Label size={19} weight="bold" style={{ textAlign: "center" }}>
          {title}
        </Label>
        <Label muted style={{ textAlign: "center", maxWidth: 270 }}>
          {description}
        </Label>
        {action && onAction ? (
          <Button
            title={action}
            onPress={onAction}
            compact
            icon="plus"
            style={{ marginTop: 5 }}
          />
        ) : null}
      </View>
    </Motion>
  );
}
export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = usePreferences();
  return (
    <View style={styles.split}>
      <Label size={18} weight="extra" style={{ letterSpacing: -0.4, flex: 1 }}>
        {title}
      </Label>
      {action && onAction ? (
        <Tap
          onPress={onAction}
          accessibilityRole="button"
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Label size={12} weight="bold" color={colors.primary}>
            {action}
          </Label>
          <Icon name="chevron" size={15} color={colors.primary} />
        </Tap>
      ) : null}
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
  return <Motion style={{ gap: 19 }}>{children}</Motion>;
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
