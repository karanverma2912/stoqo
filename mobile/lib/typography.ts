import { isLoaded } from "expo-font";
import type { TextStyle } from "react-native";
export type FontWeight = "regular" | "medium" | "semi" | "bold" | "extra";
const faces = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semi: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extra: "Manrope_800ExtraBold",
};
const weights = {
  regular: "400",
  medium: "500",
  semi: "600",
  bold: "700",
  extra: "800",
} as const;
export function typeface(weight: FontWeight = "medium"): TextStyle {
  return isLoaded(faces[weight])
    ? { fontFamily: faces[weight] }
    : { fontWeight: weights[weight] };
}
