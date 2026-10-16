import React, { useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";
import {
  CameraView,
  scanFromURLAsync,
  useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { usePreferences } from "../lib/preferences";
import { Button, ErrorBox, Label } from "./ui";
import { Sheet } from "./sheet";

const barcodeTypes = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "qr",
] as const;

// Mounted only while open: the product form stays mounted behind this sheet.
export function BarcodeCapture({
  onCaptured,
  onClose,
}: {
  onCaptured: (code: string) => void;
  onClose: () => void;
}) {
  const { colors } = usePreferences();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [error, setError] = useState("");
  const captured = useRef(false),
    active = useRef(true);
  React.useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  React.useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void getPermission().catch(() => {});
    });
    return () => listener.remove();
  }, [getPermission]);
  function found(raw: string) {
    if (!active.current || captured.current) return;
    const code = raw.trim();
    if (!code || code.length > 100) {
      setError(
        "This barcode is too long. Try the product barcode or enter it manually.",
      );
      return;
    }
    captured.current = true;
    onCaptured(code);
  }
  async function photo() {
    try {
      setError("");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled || !active.current) return;
      const codes = await scanFromURLAsync(result.assets[0].uri, [
        ...barcodeTypes,
      ]);
      if (!active.current) return;
      if (!codes.length)
        throw new Error(
          "No barcode found. Try a clear close-up or enter it manually.",
        );
      found(codes[0].data);
    } catch (e) {
      if (active.current) setError((e as Error).message);
    }
  }
  return (
    <Sheet title="Scan product barcode" onClose={onClose}>
      <Label muted>
        Scan the code on the pack. Your product details will stay here.
      </Label>
      {permission?.granted ? (
        <View
          style={{
            height: 260,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#14251B",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
            onBarcodeScanned={({ data }) => found(data)}
            onMountError={() =>
              setError(
                "The camera could not open. Try a photo or enter the barcode manually.",
              )
            }
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 25,
              right: 25,
              top: 80,
              bottom: 80,
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: 14,
            }}
          />
        </View>
      ) : (
        <Button
          title={
            permission?.canAskAgain === false
              ? "Open phone settings"
              : "Allow camera"
          }
          onPress={() => {
            void (
              permission?.canAskAgain === false
                ? Linking.openSettings()
                : requestPermission()
            ).catch(() =>
              setError(
                "Allow camera access in your phone settings, or enter the barcode manually.",
              ),
            );
          }}
        />
      )}
      <ErrorBox message={error} />
      <Button
        title="Scan a photo"
        kind="soft"
        icon="scan"
        onPress={() => void photo()}
      />
      <Button title="Enter barcode manually" kind="soft" onPress={onClose} />
    </Sheet>
  );
}
