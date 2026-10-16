import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { units } from "../lib/api";
import { useDurableWrite } from "../lib/durable-write";
import { stockChange, type StockChangeType } from "../lib/stock-change";
import type { Product } from "../lib/types";
import { Button, ErrorBox, Field, Label, Segmented } from "./ui";

export function StockAdjustment({
  product,
  initialType = "stock_in",
  onSaved,
}: {
  product: Product;
  initialType?: StockChangeType;
  onSaved?: () => void;
}) {
  const { business } = useAuth(),
    cache = useQueryClient();
  const write = useDurableWrite(`stock.${product.id}`);
  const [quantity, setQuantity] = useState(""),
    [type, setType] = useState<StockChangeType>(initialType),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = busy || !write.ready || !!write.pending;
  const pending = write.pending?.body.stock_movement;
  const shownType = pending?.movement_type ?? type;
  const shownQuantity = pending
    ? String(pending.quantity).replace(/^-/, "")
    : quantity;
  const delta = Number(shownQuantity) * (shownType === "stock_in" ? 1 : -1);
  async function adjust() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      // A pending request keeps its original body and key even after reopening.
      const amount = pending
        ? String(pending.quantity)
        : stockChange(quantity, type, product.current_stock);
      await write.execute(
        "stock_movements",
        {
          stock_movement: {
            product_id: product.id,
            quantity: amount,
            movement_type: type,
            note,
          },
        },
        "stock_movement",
      );
      setQuantity("");
      setNote("");
      setNotice("Stock updated.");
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Label weight="bold">{product.display_name || product.name}</Label>
      <Label
        muted
      >{`${units(product.current_stock)} ${product.unit} available`}</Label>
      <Segmented
        options={[
          { value: "stock_in", label: "Add stock" },
          { value: "stock_out", label: "Remove" },
          { value: "damage", label: "Damaged" },
        ]}
        value={shownType}
        onChange={(value) => {
          setType(value as StockChangeType);
          setError("");
          setNotice("");
        }}
        disabled={locked}
      />
      <Field
        label="Quantity"
        hint={`In ${product.unit}. Up to 3 decimal places.`}
        value={shownQuantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        editable={!locked}
      />
      <Field
        label="Note (optional)"
        value={pending ? pending.note : note}
        onChangeText={setNote}
        maxLength={500}
        editable={!locked}
      />
      {pending ? (
        <Label muted>
          A saved stock change needs a retry. It will only be applied once.
        </Label>
      ) : Number.isFinite(delta) && shownQuantity && delta !== 0 ? (
        <Label>{`Stock after change: ${units(Number(product.current_stock) + delta)} ${product.unit}`}</Label>
      ) : null}
      <ErrorBox message={error || write.error} />
      {notice ? <Label accessibilityLiveRegion="polite">{notice}</Label> : null}
      <Button
        title={pending ? "Retry stock change" : "Confirm stock change"}
        busy={busy}
        disabled={!write.ready || (!pending && !quantity.trim())}
        onPress={() => void adjust()}
      />
    </>
  );
}
