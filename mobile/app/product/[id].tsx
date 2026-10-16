import React, { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, money, units } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useCart } from "../../lib/cart";
import { permissions } from "../../lib/permissions";
import {
  Button,
  Card,
  ErrorBox,
  Heading,
  Label,
  Loading,
  Screen,
} from "../../components/ui";
import { ProductForm } from "../../components/product-form";
import { StockAdjustment } from "../../components/stock-adjustment";
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
    permission = permissions(business?.role);
  const [edit, setEdit] = useState(false),
    [error, setError] = useState("");
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
  const p = product.data?.data;
  return (
    <Screen title="Product" back>
      {product.isLoading ? <Loading /> : null}
      <ErrorBox message={product.error?.message || error} />
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
          {permission.stock ? (
            <Card>
              <Heading title="Move stock" />
              <StockAdjustment key={`${business?.id}.${p.id}`} product={p} />
            </Card>
          ) : null}
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
