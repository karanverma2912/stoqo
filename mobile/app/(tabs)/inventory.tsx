import React, { useState } from "react";
import { FlatList, Image, Text, View, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { api, apiOrigin, money, sessionHeaders, units } from "../../lib/api";
import { usePreferences } from "../../lib/preferences";
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
} from "../../components/ui";
import type { Product } from "../../lib/types";
export default function Inventory() {
  const { business } = useAuth(),
    { colors } = usePreferences(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all");
  const result = useInfiniteQuery({
    queryKey: ["store", business?.id, "products", q, filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<Product[]>(
        `products?page=${pageParam}&q=${encodeURIComponent(q)}&filter=${filter}`,
        {},
        business?.id,
      ),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    enabled: !!business,
  });
  const products = result.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <Screen scroll={false}>
      <Heading
        title="Inventory"
        description="Every product. Every little movement."
      />
      <Field
        label="Search"
        value={q}
        onChangeText={setQ}
        placeholder="Name, SKU or barcode"
      />
      <Row>
        {["all", "low", "out"].map((v) => (
          <Pill
            key={v}
            label={
              v === "all" ? "All" : v === "low" ? "Low stock" : "Out of stock"
            }
            active={filter === v}
            onPress={() => setFilter(v)}
          />
        ))}
      </Row>
      <Row>
        <View style={styles.grow}>
          <Button
            title="Add product"
            onPress={() => router.push("/product/new")}
          />
        </View>
        <Button
          title="Scan"
          kind="soft"
          onPress={() => router.push("/scan?mode=inventory")}
        />
      </Row>
      <ErrorBox message={result.error?.message} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ gap: 12, paddingBottom: 25 }}
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
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Card>
              <Label>No products found</Label>
              <Label muted>Add your first product or try another search.</Label>
            </Card>
          }
          ListFooterComponent={result.isFetchingNextPage ? <Loading /> : null}
          renderItem={({ item: p }) => (
            <Card onPress={() => router.push(`/product/${p.id}`)}>
              <View style={styles.split}>
                {p.image_path ? (
                  <Image
                    source={{
                      uri: `${apiOrigin()}${p.image_path}`,
                      headers: sessionHeaders(business?.id),
                    }}
                    style={{ width: 52, height: 52, borderRadius: 12 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: colors.soft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 23,
                        fontWeight: "800",
                      }}
                    >
                      {p.name[0]}
                    </Text>
                  </View>
                )}
                <View style={styles.grow}>
                  <Label>{p.display_name || p.name}</Label>
                  <Label muted>
                    {money(p.selling_price, business?.currency)}
                  </Label>
                </View>
                <View>
                  <Text
                    style={{
                      color:
                        p.stock_status === "healthy"
                          ? colors.ink
                          : colors.danger,
                      fontSize: 20,
                      fontWeight: "800",
                      textAlign: "right",
                    }}
                  >
                    {units(p.current_stock)}
                  </Text>
                  <Label muted>{p.unit}</Label>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
