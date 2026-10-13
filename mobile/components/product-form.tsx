import React, { useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, patch } from "../lib/api";
import { useDurableWrite } from "../lib/durable-write";
import { useAuth } from "../lib/auth";
import { permissions } from "../lib/permissions";
import { Button, Card, ErrorBox, Field, Label, Pill, Row } from "./ui";
import type { Product, Supplier } from "../lib/types";
export function ProductForm({
  product,
  barcode = "",
  onSaved,
}: {
  product?: Product;
  barcode?: string;
  onSaved: (p: Product) => void;
}) {
  const { business } = useAuth(),
    cache = useQueryClient(),
    p = permissions(business?.role);
  const [name, setName] = useState(product?.name ?? ""),
    [size, setSize] = useState(product?.size ?? ""),
    [color, setColor] = useState(product?.color ?? ""),
    [code, setCode] = useState(product?.barcode ?? barcode),
    [sku, setSku] = useState(product?.sku ?? ""),
    [price, setPrice] = useState(product?.selling_price ?? ""),
    [cost, setCost] = useState(product?.purchase_price ?? ""),
    [quantity, setQuantity] = useState("0"),
    [threshold, setThreshold] = useState(product?.low_stock_threshold ?? "5"),
    [unit, setUnit] = useState(product?.unit ?? "units"),
    [supplier, setSupplier] = useState<number | undefined>(
      product?.supplier_id,
    ),
    [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const write = useDurableWrite(`product.${product?.id ?? "new"}`);
  const locked = busy || !!write.pending;
  const suppliers = useQuery({
    queryKey: ["store", business?.id, "suppliers"],
    queryFn: () => api<Supplier[]>("suppliers?per_page=100", {}, business?.id),
    enabled: !!business && p.write,
  });
  async function save() {
    setBusy(true);
    setError("");
    try {
      const attributes = {
        name: name.trim(),
        size,
        color,
        barcode: code || null,
        sku: sku || null,
        selling_price: price,
        low_stock_threshold: threshold,
        unit,
        ...(p.costs ? { purchase_price: cost || "0" } : {}),
        ...(p.write ? { supplier_id: supplier ?? null } : {}),
      };
      const result = await write.execute<Product>(
        product ? `products/${product.id}` : "products",
        { product: attributes, initial_quantity: quantity, photo: image },
        undefined,
        (body) => {
          if (body.photo) {
            const form = new FormData();
            for (const [key, value] of Object.entries(body.product))
              form.append(
                `product[${key}]`,
                value === null ? "" : String(value),
              );
            if (!product)
              form.append("initial_quantity", body.initial_quantity);
            form.append("idempotency_key", body.idempotency_key);
            form.append("product[image]", {
              uri: body.photo.uri,
              name: body.photo.fileName ?? "product.jpg",
              type: body.photo.mimeType ?? "image/jpeg",
            } as unknown as Blob);
            return { method: product ? "PATCH" : "POST", body: form };
          }
          const data = {
            product: body.product,
            initial_quantity: body.initial_quantity,
            idempotency_key: body.idempotency_key,
          };
          return product ? patch(data) : post(data);
        },
      );
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
      onSaved(result.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Field
        editable={!locked}
        label="Product name"
        value={name}
        onChangeText={setName}
        maxLength={200}
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Field
            editable={!locked}
            label="Size"
            value={size}
            onChangeText={setSize}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            editable={!locked}
            label="Colour"
            value={color}
            onChangeText={setColor}
          />
        </View>
      </Row>
      <Field
        editable={!locked}
        label="Barcode"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        maxLength={100}
      />
      <Field
        editable={!locked}
        label="SKU"
        value={sku}
        onChangeText={setSku}
        maxLength={100}
      />
      <Field
        editable={!locked}
        label="Sell price"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      {p.costs && (
        <Field
          editable={!locked}
          label="Buy price"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
        />
      )}
      {!product && (
        <Field
          editable={!locked}
          label="Opening stock"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
        />
      )}
      <Row>
        <View style={{ flex: 1 }}>
          <Field
            editable={!locked}
            label="Unit"
            value={unit}
            onChangeText={setUnit}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            editable={!locked}
            label="Low stock threshold"
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="decimal-pad"
          />
        </View>
      </Row>
      {p.write && (
        <>
          <Label>Supplier</Label>
          <Row>
            <Pill
              label="None"
              active={!supplier}
              onPress={locked ? undefined : () => setSupplier(undefined)}
            />
            {suppliers.data?.data.map((s) => (
              <Pill
                key={s.id}
                label={s.name}
                active={supplier === s.id}
                onPress={locked ? undefined : () => setSupplier(s.id)}
              />
            ))}
          </Row>
        </>
      )}
      <Button
        title={image ? "Change photo" : "Add photo"}
        disabled={locked}
        kind="soft"
        onPress={() =>
          void ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          })
            .then((r) => {
              if (!r.canceled) setImage(r.assets[0]);
            })
            .catch((e) => setError(e.message))
        }
      />
      {image && (
        <Image
          source={{ uri: image.uri }}
          style={{ width: 100, height: 100, borderRadius: 15 }}
        />
      )}
      {write.pending && (
        <Label
          muted
        >{`Pending product: ${write.pending.body.product.name}. Retry completes the saved request once.`}</Label>
      )}
      <ErrorBox message={error || write.error} />
      <Button
        title={write.pending ? "Retry product" : "Save product"}
        busy={busy}
        disabled={!write.ready || (!write.pending && (!name.trim() || !price))}
        onPress={() => void save()}
      />
    </Card>
  );
}
