import React from "react";
import { View } from "react-native";
import { usePreferences } from "../lib/preferences";
import { Brand, Icon, Label } from "./ui";
import { Motion } from "./motion";
export function AuthHero() {
  const { colors } = usePreferences();
  return (
    <View
      style={{
        backgroundColor: colors.hero,
        borderRadius: 29,
        minHeight: 235,
        padding: 24,
        overflow: "hidden",
        justifyContent: "space-between",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -37,
          bottom: -78,
          width: 235,
          height: 235,
          borderRadius: 120,
          borderWidth: 1,
          borderColor: "#42614A",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -12,
          bottom: -57,
          width: 188,
          height: 188,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: "#42614A",
        }}
      />
      <Brand inverted />
      <View style={{ marginTop: 25, maxWidth: "72%" }}>
        <Label
          size={34}
          weight="extra"
          color={colors.heroInk}
          style={{ lineHeight: 39, letterSpacing: -1.5 }}
        >
          {"A good day\nstarts here."}
        </Label>
        <Label size={11} color="#C3D5C6" style={{ marginTop: 10 }}>
          Your stock. Your sales. Your people.
        </Label>
      </View>
      <View
        pointerEvents="none"
        accessible={false}
        style={{
          position: "absolute",
          right: 17,
          top: 65,
          width: 82,
          height: 110,
        }}
      >
        <Motion
          delay={130}
          style={{
            position: "absolute",
            right: 0,
            top: 7,
            transform: [{ rotate: "10deg" }],
          }}
        >
          <View
            style={{
              width: 78,
              height: 96,
              borderRadius: 20,
              backgroundColor: "#CEE6B9",
              padding: 14,
              gap: 10,
            }}
          >
            <Icon name="box" size={26} color="#245A40" />
            <View
              style={{
                height: 5,
                borderRadius: 3,
                backgroundColor: "#9CBC8E",
                width: 42,
              }}
            />
            <View
              style={{
                height: 5,
                borderRadius: 3,
                backgroundColor: "#9CBC8E",
                width: 31,
              }}
            />
          </View>
        </Motion>
        <Motion
          delay={240}
          style={{ position: "absolute", left: 0, bottom: -2 }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: colors.hero,
            }}
          >
            <Icon name="check" size={19} color={colors.hero} />
          </View>
        </Motion>
      </View>
    </View>
  );
}
