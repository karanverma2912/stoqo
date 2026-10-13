import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, money, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useCart } from "../../lib/cart";
import { cartTotal } from "../../lib/cart-math";
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
  styles,
  confirm,
} from "../../components/ui";
import type { Sale } from "../../lib/types";
export default function Sell() {
  const { business } = useAuth(),
    cart = useCart(),
    cache = useQueryClient(),
    p = permissions(business?.role);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const draft = cart.state.active,
    locked = !!cart.state.pending || busy;
  let total = "0.00",
    invalid = "";
  try {
    total = cartTotal(draft.items, draft.discount).total;
  } catch (e) {
    invalid = (e as Error).message;
  }
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const pending = await cart.prepare();
      if (!pending) return;
      const result = await api<Sale>(
        "sales",
        post({
          sale: {
            ...pending.payload,
            items: pending.payload.items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
            idempotency_key: pending.idempotency_key,
          },
        }),
        business?.id,
      );
      await cart.clear();
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
      if (cart.isCurrent()) router.push(`/sales/${result.data.id}`);
    } catch (e) {
      if (e instanceof ApiError && [400, 402, 403, 404, 422].includes(e.status))
        await cart.unlock();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!cart.ready)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  return (
    <Screen>
      <Heading
        title="A faster checkout."
        description="Scan. Review. Bill. You're done."
      />
      <Button
        title="Scan products"
        disabled={locked}
        onPress={() => router.push("/scan?mode=cart")}
      />
      <Button
        title="Choose from inventory"
        kind="soft"
        disabled={locked}
        onPress={() => router.push("/(tabs)/inventory")}
      />
      {cart.state.pending && (
        <Card>
          <Label>This checkout needs a response.</Label>
          <Label muted>
            Retry sends the same bill request, so your stock is deducted once.
          </Label>
        </Card>
      )}
      <ErrorBox message={error || invalid} />
      {draft.items.map((item) => (
        <Card key={item.product_id}>
          <View style={styles.split}>
            <View style={styles.grow}>
              <Label>{item.name}</Label>
              <Label
                muted
              >{`${item.current_stock} ${item.unit} available`}</Label>
            </View>
            <Button
              title="Remove"
              kind="soft"
              disabled={locked}
              onPress={() => cart.remove(item.product_id)}
            />
          </View>
          <Row>
            <View style={styles.grow}>
              <Field
                label="Quantity"
                keyboardType="decimal-pad"
                editable={!locked}
                value={item.quantity}
                onChangeText={(v) =>
                  cart.setLine(item.product_id, "quantity", v)
                }
              />
            </View>
            <View style={styles.grow}>
              <Field
                label="Sell price"
                keyboardType="decimal-pad"
                editable={!locked && p.write}
                value={item.unit_price}
                onChangeText={(v) =>
                  cart.setLine(item.product_id, "unit_price", v)
                }
              />
            </View>
          </Row>
        </Card>
      ))}
      {draft.items.length ? (
        <>
          <Card>
            <Field
              label="Customer name (optional)"
              value={draft.customer_name}
              maxLength={120}
              editable={!locked}
              onChangeText={(customer_name) => cart.update({ customer_name })}
            />
            <Field
              label="Customer phone (optional)"
              value={draft.customer_phone}
              maxLength={30}
              keyboardType="phone-pad"
              editable={!locked}
              onChangeText={(customer_phone) => cart.update({ customer_phone })}
            />
            {p.write && (
              <Field
                label="Discount"
                value={draft.discount}
                keyboardType="decimal-pad"
                editable={!locked}
                onChangeText={(discount) => cart.update({ discount })}
              />
            )}
            <Label>Payment method</Label>
            <Row>
              {(["cash", "upi", "card", "other"] as const).map((method) => (
                <Pill
                  key={method}
                  label={method.toUpperCase()}
                  active={draft.payment_method === method}
                  onPress={
                    locked
                      ? undefined
                      : () => cart.update({ payment_method: method })
                  }
                />
              ))}
            </Row>
            <Label large>{money(total, business?.currency)}</Label>
            <Button
              title={cart.state.pending ? "Retry checkout" : "Complete bill"}
              busy={busy}
              disabled={!!invalid}
              onPress={() =>
                cart.state.pending
                  ? void checkout()
                  : confirm(
                      "Complete this bill?",
                      `${money(total, business?.currency)} · ${draft.payment_method.toUpperCase()}. This records the sale and deducts stock.`,
                      () => void checkout(),
                    )
              }
            />
            <Button
              title="Hold cart"
              kind="soft"
              disabled={locked}
              onPress={() => {
                try {
                  cart.hold();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Label>Your cart is ready for its first item.</Label>
          <Label muted>Scan products or pick from inventory.</Label>
        </Card>
      )}
      {cart.state.held.length > 0 && <Heading title="Held carts" />}
      {cart.state.held.map((held, index) => (
        <Card key={index}>
          <Label>{`${held.items.length} products · ${held.customer_name || "Walk-in"}`}</Label>
          <Button
            title="Resume cart"
            kind="soft"
            disabled={locked}
            onPress={() => cart.resume(index)}
          />
        </Card>
      ))}
    </Screen>
  );
}
