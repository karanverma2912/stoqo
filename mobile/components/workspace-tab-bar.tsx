import React, { useEffect, useState } from "react";
import { Keyboard, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "../lib/preferences";
import { Icon, Label } from "./ui";
import { Tap } from "./motion";
import type { IconName } from "./icon";
const icons: Record<string, IconName> = {
  index: "home",
  inventory: "box",
  sell: "plus",
  assistant: "sparkle",
  more: "grid",
};
export function WorkspaceTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, tr } = usePreferences(),
    insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboard(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboard) return null;
  return (
    <View style={{ backgroundColor: colors.bg }}>
      <View
        style={{
          marginHorizontal: 17,
          marginTop: 6,
          marginBottom: Math.max(insets.bottom, 12),
          padding: 7,
          height: 77,
          borderRadius: 27,
          flexDirection: "row",
          backgroundColor: colors.card,
          borderColor: colors.line,
          borderWidth: 1,
          shadowColor: "#173F2E",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 18,
          elevation: 4,
        }}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index,
            central = route.name === "sell",
            options = descriptors[route.key].options;
          return (
            <Tap
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tr(
                options.tabBarAccessibilityLabel ?? options.title ?? route.name,
              )}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <View
                style={{
                  width: central ? 45 : 44,
                  height: central ? 39 : 33,
                  borderRadius: central ? 15 : 12,
                  backgroundColor: central
                    ? colors.primary
                    : selected
                      ? colors.soft
                      : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={icons[route.name] ?? "more"}
                  color={
                    central
                      ? colors.onPrimary
                      : selected
                        ? colors.primary
                        : colors.muted
                  }
                  size={central ? 24 : 21}
                  strokeWidth={selected ? 2.1 : 1.8}
                />
              </View>
              <Label
                size={10}
                weight={selected ? "extra" : "semi"}
                color={selected ? colors.ink : colors.muted}
              >
                {options.title ?? route.name}
              </Label>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
