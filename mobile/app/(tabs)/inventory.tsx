import React, { useEffect, useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { permissions } from "../../lib/permissions";
import { usePreferences } from "../../lib/preferences";
import {
  EmptyState,
  ErrorBox,
  Field,
  Heading,
  IconButton,
  Label,
  Loading,
  Motion,
  Screen,
  Segmented,
  styles,
} from "../../components/ui";
import { ProductRow } from "../../components/product-row";
import type { Product } from "../../lib/types";
export default function Inventory() {
  const { business } = useAuth(),
    { colors } = usePreferences(),
    p = permissions(business?.role);
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);
  const result = useInfiniteQuery({
    queryKey: ["store", business?.id, "products", search, filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<Product[]>(
        `products?page=${pageParam}&q=${encodeURIComponent(search)}&filter=${filter}`,
        {},
        business?.id,
      ),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    enabled: !!business,
  });
  const products = result.data?.pages.flatMap((page) => page.data) ?? [];
  const searching = !!search || filter !== "all";
  return (
    <Screen scroll={false}>
      <View style={styles.split}>
        <View style={{ flex: 1 }}>
          <Heading
            title="Your inventory"
            description="A place for every product."
          />
        </View>
        <IconButton
          name="scan"
          label="Scan product"
          onPress={() => router.push("/scan?mode=inventory")}
        />
        {p.stock ? (
          <IconButton
            name="plus"
            label="Add product"
            kind="primary"
            onPress={() => router.push("/product/new")}
          />
        ) : null}
      </View>
      <Field
        label="Find a product"
        icon="search"
        value={q}
        onChangeText={setQ}
        placeholder="Name, SKU or barcode"
        autoCorrect={false}
        returnKeyType="search"
      />
      <Segmented
        options={[
          { value: "all", label: "All products" },
          { value: "low", label: "Low stock" },
          { value: "out", label: "Out of stock" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <View style={styles.split}>
        <Label size={12} weight="bold">
          {searching ? "Search results" : "Your products"}
        </Label>
        <Label size={11} muted>
          {result.data ? `${result.data.pages[0].meta.total} products` : ""}
        </Label>
      </View>
      <ErrorBox message={result.error?.message} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(product) => String(product.id)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 11, paddingBottom: 25 }}
          refreshControl={
            <RefreshControl
              refreshing={result.isRefetching}
              onRefresh={() => void result.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage)
              void result.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            result.isError ? null : (
              <EmptyState
                title={
                  searching
                    ? "No matches just yet."
                    : "Good things start small."
                }
                description={
                  searching
                    ? "Try another name, barcode or stock filter."
                    : "Add your first product and give your stock a home."
                }
                action={
                  searching
                    ? "Clear filters"
                    : p.stock
                      ? "Add your first product"
                      : undefined
                }
                onAction={
                  searching
                    ? () => {
                        setQ("");
                        setFilter("all");
                      }
                    : () => router.push("/product/new")
                }
              />
            )
          }
          ListFooterComponent={result.isFetchingNextPage ? <Loading /> : null}
          renderItem={({ item, index }) =>
            index < 4 ? (
              <Motion delay={index * 45}>
                <ProductRow
                  product={item}
                  onPress={() => router.push(`/product/${item.id}`)}
                />
              </Motion>
            ) : (
              <ProductRow
                product={item}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            )
          }
        />
      )}
    </Screen>
  );
}
