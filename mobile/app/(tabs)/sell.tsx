import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, money, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useCart } from "../../lib/cart";
import { cartTotal } from "../../lib/cart-math";
import { permissions } from "../../lib/permissions";
import { usePreferences } from "../../lib/preferences";
import {
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  Heading,
  Icon,
  IconButton,
  Label,
  Loading,
  Motion,
  Row,
  Screen,
  SectionTitle,
  Segmented,
  styles,
  confirm,
} from "../../components/ui";
import type { Sale } from "../../lib/types";

export default function Sell() {
  const { business } = useAuth(),
    { colors } = usePreferences(),
    cart = useCart(),
    cache = useQueryClient(),
    p = permissions(business?.role);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const draft = cart.state.active,
    locked = !!cart.state.pending || busy;
  let total = "0.00",
    subtotal = "0.00",
    invalid = "";
  try {
    const amounts = cartTotal(draft.items, draft.discount);
    total = amounts.total;
    subtotal = amounts.subtotal;
  } catch (e) {
    invalid = (e as Error).message;
  }
  async function checkout() {
    if (busy) return;
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
      <Motion>
        <View style={styles.split}>
          <View style={styles.grow}>
            <Heading
              title="A sale, made simple."
              description="A few taps. A happy customer."
            />
          </View>
          <View
            style={{
              width: 47,
              height: 47,
              borderRadius: 16,
              backgroundColor: colors.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="bag" color={colors.primary} />
          </View>
        </View>
      </Motion>
      {draft.items.length > 0 ? (
        <Row>
          <Button
            title="Scan items"
            icon="scan"
            disabled={locked}
            style={{ flex: 1 }}
            onPress={() => router.push("/scan?mode=cart")}
          />
          <Button
            title="Add items"
            icon="plus"
            kind="soft"
            disabled={locked}
            style={{ flex: 1 }}
            onPress={() => router.push("/(tabs)/inventory")}
          />
        </Row>
      ) : null}
      {cart.state.pending ? (
        <Card style={{ backgroundColor: colors.soft }}>
          <Label weight="bold">This checkout needs a response.</Label>
          <Label muted size={12}>
            Retry sends the same bill request, so your stock is deducted once.
          </Label>
        </Card>
      ) : null}
      <ErrorBox message={error || invalid} />
      {draft.items.length > 0 ? (
        <SectionTitle title={`Your cart · ${draft.items.length}`} />
      ) : null}
      {draft.items.map((item) => (
        <Card key={item.product_id} style={{ gap: 17 }}>
          <View style={styles.split}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: colors.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="box" color={colors.primary} size={21} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Label weight="bold">{item.name}</Label>
              <Label
                muted
                size={11}
              >{`${item.current_stock} ${item.unit} available`}</Label>
            </View>
            <IconButton
              name="close"
              label={`Remove ${item.name}`}
              kind="bare"
              disabled={locked}
              onPress={() => cart.remove(item.product_id)}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
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
          </View>
        </Card>
      ))}
      {draft.items.length ? (
        <>
          <Card style={{ gap: 19 }}>
            <View style={styles.split}>
              <Label weight="extra" size={17}>
                The details
              </Label>
              <Label muted size={11}>
                Customer is optional
              </Label>
            </View>
            <Field
              label="Customer name"
              icon="user"
              placeholder="Walk-in customer"
              value={draft.customer_name}
              maxLength={120}
              editable={!locked}
              onChangeText={(customer_name) => cart.update({ customer_name })}
            />
            <Field
              label="Customer phone"
              placeholder="Phone number"
              value={draft.customer_phone}
              maxLength={30}
              keyboardType="phone-pad"
              editable={!locked}
              onChangeText={(customer_phone) => cart.update({ customer_phone })}
            />
            {p.write ? (
              <Field
                label="Discount"
                value={draft.discount}
                keyboardType="decimal-pad"
                editable={!locked}
                onChangeText={(discount) => cart.update({ discount })}
              />
            ) : null}
          </Card>
          <View style={{ gap: 11 }}>
            <SectionTitle title="Payment method" />
            <Segmented
              options={["cash", "upi", "card", "other"].map((method) => ({
                value: method,
                label: method.toUpperCase(),
              }))}
              value={draft.payment_method}
              disabled={locked}
              onChange={(payment_method) =>
                cart.update({
                  payment_method: payment_method as typeof draft.payment_method,
                })
              }
            />
          </View>
          <Card
            style={{
              backgroundColor: colors.hero,
              borderColor: colors.hero,
              padding: 23,
              gap: 17,
            }}
          >
            <View style={styles.split}>
              <Label color={colors.heroInk} size={12}>
                Subtotal
              </Label>
              <Label color={colors.heroInk} size={12}>
                {money(subtotal, business?.currency)}
              </Label>
            </View>
            {Number(draft.discount) > 0 ? (
              <View style={styles.split}>
                <Label color={colors.heroInk} size={12}>
                  Discount
                </Label>
                <Label
                  color={colors.accent}
                  size={12}
                >{`− ${money(draft.discount, business?.currency)}`}</Label>
              </View>
            ) : null}
            <View style={{ height: 1, backgroundColor: "#FFFFFF25" }} />
            <View style={styles.split}>
              <View>
                <Label color={colors.heroInk} size={12}>
                  Total to pay
                </Label>
                <Label
                  color={colors.heroInk}
                  size={34}
                  weight="extra"
                  style={{ letterSpacing: -1.3 }}
                >
                  {money(total, business?.currency)}
                </Label>
              </View>
              <Icon name="receipt" color={colors.accent} size={29} />
            </View>
            <Button
              title={cart.state.pending ? "Retry checkout" : "Complete bill"}
              trailingIcon="arrow"
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
              kind="accent"
            />
          </Card>
          <Button
            title="Hold cart for later"
            kind="soft"
            icon="bag"
            disabled={locked}
            onPress={() => {
              try {
                cart.hold();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
        </>
      ) : (
        <Motion delay={70}>
          <Card style={{ paddingVertical: 26 }}>
            <EmptyState
              icon="bag"
              title="Good things start here."
              description="Scan a barcode or choose a product to start your next bill."
              action="Scan a product"
              onAction={() => router.push("/scan?mode=cart")}
            />
            <Button
              title="Browse inventory"
              kind="soft"
              icon="box"
              onPress={() => router.push("/(tabs)/inventory")}
            />
          </Card>
        </Motion>
      )}
      {cart.state.held.length > 0 ? (
        <SectionTitle title="Saved for later" />
      ) : null}
      {cart.state.held.map((held, index) => (
        <Card
          key={index}
          style={{ flexDirection: "row", alignItems: "center", gap: 11 }}
        >
          <Icon name="bag" color={colors.primary} size={21} />
          <View style={{ flex: 1, gap: 2 }}>
            <Label weight="bold" size={13}>
              {held.customer_name || "Walk-in customer"}
            </Label>
            <Label muted size={11}>{`${held.items.length} products`}</Label>
          </View>
          <Button
            title="Resume"
            compact
            kind="soft"
            disabled={locked}
            onPress={() => cart.resume(index)}
          />
        </Card>
      ))}
    </Screen>
  );
}
