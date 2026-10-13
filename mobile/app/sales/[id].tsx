import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDurableWrite } from "../../lib/durable-write";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, money, units } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { permissions } from "../../lib/permissions";
import { shareReceipt } from "../../lib/receipts";
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
export default function Bill() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { business } = useAuth(),
    cache = useQueryClient(),
    p = permissions(business?.role);
  const result = useQuery({
    queryKey: ["store", business?.id, "sale", id],
    queryFn: () => api<Sale>(`sales/${id}`, {}, business?.id),
    enabled: !!business,
  });
  const sale = result.data?.data;
  const [returnMode, setReturnMode] = useState(false),
    [quantities, setQuantities] = useState<Record<number, string>>({}),
    [dispositions, setDispositions] = useState<Record<number, string>>({}),
    [reason, setReason] = useState(""),
    [method, setMethod] = useState("cash"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const write = useDurableWrite(`return.${id}`);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        reason,
        refund_method: method,
        items: Object.entries(quantities)
          .filter(([, v]) => Number(v) > 0)
          .map(([key, q]) => ({
            sale_item_id: Number(key),
            quantity: q,
            disposition: dispositions[Number(key)] ?? "sellable",
          })),
      };
      await write.execute(
        `sales/${id}/return_items`,
        { sale_return: payload },
        "sale_return",
      );
      setQuantities({});
      setReturnMode(false);
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Bill details" back>
      {result.isLoading ? <Loading /> : null}
      <ErrorBox message={result.error?.message || error || write.error} />
      {sale && (
        <>
          <Heading
            title={sale.number}
            description={`${new Date(sale.created_at).toLocaleString()} · ${sale.cashier_name}`}
          />
          <Card>
            <Label>{sale.customer_name || "Walk-in customer"}</Label>
            {sale.customer_phone && <Label muted>{sale.customer_phone}</Label>}
            {sale.items.map((item) => (
              <View key={item.id} style={styles.split}>
                <View style={styles.grow}>
                  <Label>{item.name}</Label>
                  <Label
                    muted
                  >{`${units(item.quantity)} ${item.unit} · ${units(item.returned_quantity)} returned`}</Label>
                </View>
                <Label>{money(item.line_total, sale.currency)}</Label>
              </View>
            ))}
            <Label
              muted
            >{`Discount: ${money(sale.discount, sale.currency)}`}</Label>
            <Label large>{money(sale.total, sale.currency)}</Label>
            <Label>{sale.payment_method.toUpperCase()}</Label>
            <Button
              title="Share bill PDF"
              kind="soft"
              onPress={() =>
                void shareReceipt(sale).catch((e) => setError(e.message))
              }
            />
            {p.write && (sale.status !== "returned" || !!write.pending) && (
              <Button
                title={returnMode ? "Close return" : "Return items"}
                kind="soft"
                onPress={() => setReturnMode(!returnMode)}
              />
            )}
          </Card>
          {(returnMode || write.pending) && (
            <Card>
              <Heading title="Process a return" />
              {write.pending && (
                <Label muted>
                  Retry completes the saved return once, even if the previous
                  response was interrupted.
                </Label>
              )}
              <Label muted>
                Choose quantities and whether the returned goods can be sold
                again.
              </Label>
              {sale.items
                .filter((i) => Number(i.quantity) > Number(i.returned_quantity))
                .map((item) => (
                  <View key={item.id} style={{ gap: 10 }}>
                    <Field
                      label={`${item.name} · max ${Number(item.quantity) - Number(item.returned_quantity)}`}
                      keyboardType="decimal-pad"
                      value={quantities[item.id] ?? ""}
                      editable={!busy && !write.pending}
                      onChangeText={(value) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.id]: value,
                        }))
                      }
                    />
                    <Row>
                      {["sellable", "damaged"].map((v) => (
                        <Pill
                          key={v}
                          label={v}
                          active={(dispositions[item.id] ?? "sellable") === v}
                          onPress={
                            write.pending
                              ? undefined
                              : () =>
                                  setDispositions((current) => ({
                                    ...current,
                                    [item.id]: v,
                                  }))
                          }
                        />
                      ))}
                    </Row>
                  </View>
                ))}
              <Field
                label="Return reason"
                value={reason}
                editable={!busy && !write.pending}
                onChangeText={setReason}
                maxLength={500}
              />
              <Label>Refund method</Label>
              <Row>
                {["cash", "upi", "card", "other"].map((v) => (
                  <Pill
                    key={v}
                    label={v.toUpperCase()}
                    active={method === v}
                    onPress={write.pending ? undefined : () => setMethod(v)}
                  />
                ))}
              </Row>
              <Button
                title={write.pending ? "Retry return" : "Confirm return"}
                busy={busy}
                disabled={
                  !write.ready ||
                  (!write.pending &&
                    (!reason.trim() ||
                      !Object.values(quantities).some((v) => Number(v) > 0)))
                }
                onPress={() =>
                  write.pending
                    ? void submit()
                    : confirm(
                        "Process this return?",
                        "The stock ledger and refund history will be updated.",
                        () => void submit(),
                      )
                }
              />
            </Card>
          )}
          {sale.returns.length > 0 && <Heading title="Returns" />}
          {sale.returns.map((record) => (
            <Card key={record.id}>
              <Label>{money(record.amount, sale.currency)}</Label>
              <Label>{record.reason}</Label>
              <Label
                muted
              >{`${record.user_name} · ${record.refund_method || sale.payment_method} · ${new Date(record.created_at).toLocaleString()}`}</Label>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
