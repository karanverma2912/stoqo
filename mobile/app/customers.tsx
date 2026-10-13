import React, { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, money } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
} from "../components/ui";
import type { Sale } from "../lib/types";
export default function Customers() {
  const { business } = useAuth(),
    [phone, setPhone] = useState(""),
    digits = phone.replace(/\D/g, "");
  const result = useQuery({
    queryKey: ["store", business?.id, "customers", digits],
    queryFn: () =>
      api<Sale[]>(`sales?customer_phone=${digits}`, {}, business?.id),
    enabled: !!business && digits.length >= 6 && digits.length <= 15,
  });
  const summary = result.data?.meta.customer_summary;
  return (
    <Screen title="Customer history" back>
      <Heading title="Know your regulars." />
      <Field
        label="Customer phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={20}
      />
      <ErrorBox message={result.error?.message} />
      {result.isFetching ? <Loading /> : null}
      {summary && (
        <Card>
          <Label>{`${summary.bills} bills`}</Label>
          <Label>{`Sales: ${money(summary.sales, business?.currency)}`}</Label>
          <Label>{`Returns: ${money(summary.returns, business?.currency)}`}</Label>
          <Label large>{money(summary.net, business?.currency)}</Label>
        </Card>
      )}
      {result.data?.data.map((sale) => (
        <Card key={sale.id} onPress={() => router.push(`/sales/${sale.id}`)}>
          <Label>{`${sale.number} · ${sale.customer_name || "Customer"}`}</Label>
          <Label
            muted
          >{`${money(sale.total, sale.currency)} · ${new Date(sale.created_at).toLocaleDateString()}`}</Label>
        </Card>
      ))}
    </Screen>
  );
}
