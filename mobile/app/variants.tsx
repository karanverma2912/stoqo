import React, { useState } from "react";
import { router } from "expo-router";
import { useDurableWrite } from "../lib/durable-write";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { printLabels } from "../lib/barcode-labels";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
} from "../components/ui";
import type { Product } from "../lib/types";
type Group = {
  id: number;
  name: string;
  variant_count: number;
  products: Product[];
};
export default function Variants() {
  const { business } = useAuth(),
    cache = useQueryClient(),
    [name, setName] = useState(""),
    [sizes, setSizes] = useState(""),
    [colors, setColors] = useState(""),
    [price, setPrice] = useState(""),
    [quantity, setQuantity] = useState("0"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Group | null>(null);
  const write = useDurableWrite("variants");
  const groups = useQuery({
    queryKey: ["store", business?.id, "groups"],
    queryFn: () =>
      api<Group[]>("product_groups?per_page=100", {}, business?.id),
    enabled: !!business,
  });
  async function create() {
    setBusy(true);
    setError("");
    try {
      const ss = sizes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        cc = colors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      if (
        !write.pending &&
        (!ss.length || !cc.length || ss.length * cc.length > 100)
      )
        throw new Error("Enter sizes and colours for up to 100 variants.");
      await write.execute(
        "product_groups",
        {
          product_group: {
            name,
            variants: cc.flatMap((color) =>
              ss.map((size) => ({
                size,
                color,
                selling_price: price,
                initial_quantity: quantity,
                low_stock_threshold: "5",
                unit: "units",
              })),
            ),
          },
        },
        "product_group",
      );
      setName("");
      setSizes("");
      setColors("");
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Sizes & labels" back>
      <Heading title="One family. Every variation." />
      <ErrorBox message={error || groups.error?.message || write.error} />
      {groups.isLoading ? <Loading /> : null}
      {groups.data?.data.map((g) => (
        <Card key={g.id}>
          <Label>{`${g.name} · ${g.variant_count} variants`}</Label>
          <Button
            title="View variants"
            kind="soft"
            onPress={() =>
              void api<Group>(`product_groups/${g.id}`, {}, business?.id)
                .then((r) => setSelected(r.data))
                .catch((e) => setError(e.message))
            }
          />
        </Card>
      ))}
      {selected && (
        <Card>
          <Heading title={selected.name} />
          {selected.products.map((p) => (
            <Button
              key={p.id}
              title={p.display_name || p.name}
              kind="soft"
              onPress={() => router.push(`/product/${p.id}`)}
            />
          ))}
          <Button
            title="Share barcode labels"
            onPress={() =>
              void printLabels(selected.products).catch((e) =>
                setError(e.message),
              )
            }
          />
        </Card>
      )}
      <Card>
        <Heading title="Create product variants" />
        {write.pending && (
          <Label
            muted
          >{`Pending family: ${write.pending.body.product_group.name}. Retry completes this family once.`}</Label>
        )}
        <Field
          label="Product family name"
          value={name}
          editable={!busy && !write.pending}
          onChangeText={(v) => {
            setName(v);
          }}
        />
        <Field
          label="Sizes, separated by commas"
          value={sizes}
          editable={!busy && !write.pending}
          onChangeText={(v) => {
            setSizes(v);
          }}
          placeholder="S, M, L"
        />
        <Field
          label="Colours, separated by commas"
          value={colors}
          editable={!busy && !write.pending}
          onChangeText={(v) => {
            setColors(v);
          }}
          placeholder="Black, White"
        />
        <Field
          label="Sell price for each variant"
          value={price}
          editable={!busy && !write.pending}
          onChangeText={(v) => {
            setPrice(v);
          }}
          keyboardType="decimal-pad"
        />
        <Field
          label="Opening stock per variant"
          value={quantity}
          editable={!busy && !write.pending}
          onChangeText={(v) => {
            setQuantity(v);
          }}
          keyboardType="decimal-pad"
        />
        <Button
          title={write.pending ? "Retry variants" : "Create variants"}
          busy={busy}
          disabled={
            !write.ready || (!write.pending && (!name.trim() || !price))
          }
          onPress={() => void create()}
        />
      </Card>
    </Screen>
  );
}
