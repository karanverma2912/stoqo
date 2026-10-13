import React, { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, money } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import {
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
  styles,
} from "../components/ui";
type Summary = {
  date: string;
  currency: string;
  totals: {
    bills: number;
    sales: string;
    returns: string;
    net: string;
    discounts: string;
  };
  payments: { method: string; sales: string; returns: string; net: string }[];
  employees: {
    id: number;
    name: string;
    role?: string;
    bills: number;
    sales: string;
    return_count: number;
    returns_processed: string;
  }[];
};
export default function Reports() {
  const { business } = useAuth(),
    { colors } = usePreferences();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: business?.timezone ?? "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [date, setDate] = useState(today);
  const result = useQuery({
    queryKey: ["store", business?.id, "daily-summary", date],
    queryFn: () =>
      api<Summary>(`reports/daily_summary?date=${date}`, {}, business?.id),
    enabled: !!business && /^\d{4}-\d{2}-\d{2}$/.test(date),
    refetchInterval: 45000,
  });
  const report = result.data?.data;
  return (
    <Screen title="Daily overview" back>
      <Heading title="Every sale. Every teammate." />
      <Field
        label="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        maxLength={10}
      />
      <ErrorBox message={result.error?.message} />
      {result.isLoading ? <Loading /> : null}
      {report && (
        <>
          <Card>
            <Label
              muted
            >{`${report.totals.bills} bills · ${report.date}`}</Label>
            <Label large>{money(report.totals.net, report.currency)}</Label>
            <Label
              muted
            >{`Sales ${money(report.totals.sales, report.currency)} · Returns ${money(report.totals.returns, report.currency)}`}</Label>
          </Card>
          <Heading title="Payment totals" />
          {report.payments.map((payment) => (
            <Card key={payment.method}>
              <View style={styles.split}>
                <Label>{payment.method.toUpperCase()}</Label>
                <Label>{money(payment.sales, report.currency)}</Label>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: colors.soft,
                }}
              >
                <View
                  style={{
                    height: 8,
                    borderRadius: 5,
                    backgroundColor: colors.primary,
                    width: `${Math.min(100, Number(report.totals.sales) > 0 ? (Number(payment.sales) / Number(report.totals.sales)) * 100 : 0)}%`,
                  }}
                />
              </View>
              <Label
                muted
              >{`Returns on these bills: ${money(payment.returns, report.currency)}`}</Label>
            </Card>
          ))}
          <Heading title="Employee summaries" />
          {report.employees.map((employee) => (
            <Card key={employee.id}>
              <Label>{employee.name}</Label>
              <Label muted>{employee.role || "Former member"}</Label>
              <View style={styles.split}>
                <Label>{`${employee.bills} bills`}</Label>
                <Label>{money(employee.sales, report.currency)}</Label>
              </View>
              <Label
                muted
              >{`${employee.return_count} returns · ${money(employee.returns_processed, report.currency)} refunded`}</Label>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
