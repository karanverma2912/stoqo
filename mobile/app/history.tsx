import React, { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api, money } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import {
  Card,
  ErrorBox,
  Field,
  Label,
  Loading,
  Screen,
  styles,
} from "../components/ui";
import type { Sale } from "../lib/types";
export default function History() {
  const { business } = useAuth(),
    { colors } = usePreferences(),
    [q, setQ] = useState("");
  const result = useInfiniteQuery({
    queryKey: ["store", business?.id, "sales", q],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<Sale[]>(
        `sales?page=${pageParam}&q=${encodeURIComponent(q)}`,
        {},
        business?.id,
      ),
    getNextPageParam: (r) =>
      r.meta.page < r.meta.pages ? r.meta.page + 1 : undefined,
    enabled: !!business,
  });
  return (
    <Screen title="Bills & returns" back scroll={false}>
      <Field
        label="Search bills"
        value={q}
        onChangeText={setQ}
        placeholder="Bill number, customer or phone"
      />
      <ErrorBox message={result.error?.message} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data?.pages.flatMap((p) => p.data) ?? []}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={result.isRefetching}
              onRefresh={() => void result.refetch()}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage)
              void result.fetchNextPage();
          }}
          ListFooterComponent={result.isFetchingNextPage ? <Loading /> : null}
          ListEmptyComponent={
            <Card>
              <Label>No bills yet.</Label>
            </Card>
          }
          renderItem={({ item: s }) => (
            <Card onPress={() => router.push(`/sales/${s.id}`)}>
              <View style={styles.split}>
                <View style={styles.grow}>
                  <Label>{s.number}</Label>
                  <Label muted>{s.customer_name || "Walk-in customer"}</Label>
                </View>
                <Label>{money(s.total, s.currency)}</Label>
              </View>
              <Label
                muted
              >{`${new Date(s.created_at).toLocaleString()} · ${s.cashier_name} · ${s.status.replace("_", " ")}`}</Label>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
