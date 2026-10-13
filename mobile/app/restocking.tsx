import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api, units } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Button,
  Card,
  ErrorBox,
  Heading,
  Label,
  Loading,
  Screen,
} from "../components/ui";
import type { Product } from "../lib/types";
export default function Restocking() {
  const { supplierId } = useLocalSearchParams<{ supplierId?: string }>(),
    { business } = useAuth();
  const result = useInfiniteQuery({
    queryKey: ["store", business?.id, "restocking", supplierId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<Product[]>(
        `products?page=${pageParam}&filter=restock${supplierId ? `&supplier_id=${supplierId}` : ""}`,
        {},
        business?.id,
      ),
    getNextPageParam: (r) =>
      r.meta.page < r.meta.pages ? r.meta.page + 1 : undefined,
    enabled: !!business,
  });
  return (
    <Screen title="Restocking" back>
      <Heading title="What needs topping up?" />
      <ErrorBox message={result.error?.message} />
      {result.isLoading ? <Loading /> : null}
      {result.data?.pages
        .flatMap((p) => p.data)
        .map((product) => (
          <Card
            key={product.id}
            onPress={() => router.push(`/product/${product.id}`)}
          >
            <Label>{product.display_name || product.name}</Label>
            <Label
              muted
            >{`${units(product.current_stock)} left · threshold ${units(product.low_stock_threshold)}`}</Label>
            {product.supplier_name && <Label>{product.supplier_name}</Label>}
          </Card>
        ))}
      {result.hasNextPage && (
        <Button
          title="Load more"
          kind="soft"
          busy={result.isFetchingNextPage}
          onPress={() => void result.fetchNextPage()}
        />
      )}
    </Screen>
  );
}
