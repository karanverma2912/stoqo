import React, { useMemo } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export const softLayout = LinearTransition.duration(220).reduceMotion(
  ReduceMotion.System,
);
export function Motion({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const entering = useMemo(
    () =>
      FadeInDown.duration(380)
        .delay(delay)
        .withInitialValues({ opacity: 0, translateY: 14 })
        .reduceMotion(ReduceMotion.System),
    [delay],
  );
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
export function Tap({
  children,
  style,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));
  return (
    <AnimatedPressable
      {...props}
      style={[style, animated]}
      onPressIn={(event) => {
        scale.set(
          withTiming(0.97, {
            duration: 110,
            reduceMotion: ReduceMotion.System,
          }),
        );
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(
          withTiming(1, {
            duration: 160,
            reduceMotion: ReduceMotion.System,
          }),
        );
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
