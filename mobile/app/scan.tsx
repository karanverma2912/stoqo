import React, { useRef, useState } from "react";
import { View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  scanFromURLAsync,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { api } from "../lib/api";
import { usePreferences } from "../lib/preferences";
import { Button, ErrorBox, Field, Label, Row, Screen } from "../components/ui";
import type { Product } from "../lib/types";
export default function Scan() {
  const { mode = "inventory" } = useLocalSearchParams<{ mode?: string }>(),
    { business } = useAuth(),
    cart = useCart(),
    { colors } = usePreferences(),
    [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    last = useRef({ value: "", time: 0 });
  async function found(raw: string) {
    const code = raw.trim();
    if (
      !code ||
      code.length > 100 ||
      lock.current ||
      (last.current.value === code && Date.now() - last.current.time < 1800)
    )
      return;
    lock.current = true;
    last.current = { value: code, time: Date.now() };
    setBusy(true);
    setError("");
    try {
      const products = (
        await api<Product[]>(
          `products?barcode=${encodeURIComponent(code)}`,
          {},
          business?.id,
        )
      ).data;
      if (!products.length) {
        router.replace(
          `/product/new?barcode=${encodeURIComponent(code)}&returnTo=${mode}`,
        );
        return;
      }
      if (mode === "cart") {
        cart.add(products[0]);
        setNotice(
          `${products[0].display_name || products[0].name} added to cart`,
        );
      } else router.replace(`/product/${products[0].id}`);
    } catch (e) {
      last.current = { value: "", time: 0 };
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function photo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const codes = await scanFromURLAsync(result.assets[0].uri, [
        "ean13",
        "ean8",
        "upc_a",
        "upc_e",
        "code128",
        "code39",
        "qr",
      ]);
      if (!codes.length)
        throw new Error(
          "No barcode found. Try a clear close-up or type it below.",
        );
      await found(codes[0].data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen title="Scan a barcode" back>
      <Label muted>
        {mode === "cart"
          ? "Scan different items to build your bill. Move a barcode out of view before scanning it again."
          : "A saved barcode opens its product. A new one starts Add product."}
      </Label>
      {permission?.granted ? (
        <View
          style={{
            height: 280,
            borderRadius: 25,
            overflow: "hidden",
            backgroundColor: "#14251B",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                "ean13",
                "ean8",
                "upc_a",
                "upc_e",
                "code128",
                "code39",
                "qr",
              ],
            }}
            onBarcodeScanned={({ data }) => void found(data)}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 30,
              right: 30,
              top: 90,
              bottom: 90,
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: 17,
            }}
          />
        </View>
      ) : (
        <Button title="Allow camera" onPress={() => void requestPermission()} />
      )}
      <ErrorBox message={error} />
      {notice && <Label>{notice}</Label>}
      <Field
        label="Barcode"
        value={manual}
        onChangeText={setManual}
        maxLength={100}
        autoCapitalize="none"
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Button
            title="Find product"
            busy={busy}
            disabled={!manual.trim()}
            onPress={() => void found(manual)}
          />
        </View>
        <Button title="Scan a photo" kind="soft" onPress={() => void photo()} />
      </Row>
      {mode === "cart" && (
        <Button
          title={`View cart (${cart.state.active.items.length})`}
          kind="soft"
          onPress={() => router.replace("/(tabs)/sell")}
        />
      )}
    </Screen>
  );
}
