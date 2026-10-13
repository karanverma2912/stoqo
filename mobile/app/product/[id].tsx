import React, { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useDurableWrite } from "../../lib/durable-write";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, money, units } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useCart } from "../../lib/cart";
import { permissions } from "../../lib/permissions";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Loading,
  Pill,
  Row,
  Screen,
} from "../../components/ui";
import { ProductForm } from "../../components/product-form";
import type { Product } from "../../lib/types";
type Movement = {
  id: number;
  quantity: string;
  movement_type: string;
  user_name: string;
  occurred_at: string;
  note?: string;
};
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { business } = useAuth(),
    cart = useCart(),
    cache = useQueryClient(),
    permission = permissions(business?.role);
  const [quantity, setQuantity] = useState(""),
    [type, setType] = useState("stock_in"),
    [note, setNote] = useState(""),
    [edit, setEdit] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const write = useDurableWrite(`stock.${id}`);
  const product = useQuery({
    queryKey: ["store", business?.id, "product", id],
    queryFn: () => api<Product>(`products/${id}`, {}, business?.id),
    enabled: !!business && !!id,
  });
  const movements = useQuery({
    queryKey: ["store", business?.id, "movements", id],
    queryFn: () =>
      api<Movement[]>(`stock_movements?product_id=${id}`, {}, business?.id),
    enabled: !!business && !!id,
  });
  async function adjust() {
    setBusy(true);
    setError("");
    try {
      await write.execute(
        "stock_movements",
        {
          stock_movement: {
            product_id: Number(id),
            quantity: type === "stock_in" ? quantity : `-${quantity}`,
            movement_type: type,
            note,
          },
        },
        "stock_movement",
      );
      setQuantity("");
      setNote("");
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const p = product.data?.data;
  return (
    <Screen title="Product" back>
      {product.isLoading ? <Loading /> : null}
      <ErrorBox message={product.error?.message || error || write.error} />
      {p && (
        <>
          <Heading
            title={p.display_name || p.name}
            description={[p.sku, p.barcode].filter(Boolean).join(" · ")}
          />
          <Card>
            <Label large>{`${units(p.current_stock)} ${p.unit}`}</Label>
            <Label>{money(p.selling_price, business?.currency)}</Label>
            {permission.costs && p.purchase_price && (
              <Label
                muted
              >{`Buy price: ${money(p.purchase_price, business?.currency)}`}</Label>
            )}
            <Button
              title="Add to cart"
              onPress={() => {
                try {
                  cart.add(p);
                  router.push("/(tabs)/sell");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
            {permission.write && (
              <Button
                title={edit ? "Close edit" : "Edit product"}
                kind="soft"
                onPress={() => setEdit(!edit)}
              />
            )}
          </Card>
          {edit && <ProductForm product={p} onSaved={() => setEdit(false)} />}
          <Card>
            <Heading title="Move stock" />
            {write.pending && (
              <Label
                muted
              >{`Pending change: ${write.pending.body.stock_movement.quantity}. Retry completes the original request once.`}</Label>
            )}
            <Row>
              {["stock_in", "stock_out", "damage"].map((v) => (
                <Pill
                  key={v}
                  label={v.replace("_", " ")}
                  active={type === v}
                  onPress={() => {
                    if (!busy && !write.pending) {
                      setType(v);
                    }
                  }}
                />
              ))}
            </Row>
            <Field
              label="Quantity"
              value={quantity}
              onChangeText={(v) => {
                setQuantity(v);
              }}
              keyboardType="decimal-pad"
              editable={!busy && !write.pending}
            />
            <Field
              label="Note"
              value={note}
              onChangeText={(v) => {
                setNote(v);
              }}
              maxLength={500}
              editable={!busy && !write.pending}
            />
            <Button
              title={
                write.pending ? "Retry stock change" : "Confirm stock change"
              }
              busy={busy}
              disabled={!write.ready || (!write.pending && !quantity)}
              onPress={() => void adjust()}
            />
          </Card>
          <Heading title="Stock history" />
          {movements.data?.data.map((m) => (
            <Card key={m.id}>
              <Label>{`${m.quantity} · ${m.movement_type.replace("_", " ")}`}</Label>
              <Label
                muted
              >{`${m.user_name} · ${new Date(m.occurred_at).toLocaleString()}`}</Label>
              {m.note && <Label muted>{m.note}</Label>}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
