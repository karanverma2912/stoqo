import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api, patch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import {
  Card,
  ErrorBox,
  Heading,
  Label,
  Loading,
  Screen,
  styles,
} from "../components/ui";
import type { StoreNotification } from "../lib/types";
export default function Notifications() {
  const { business } = useAuth(),
    { colors } = usePreferences(),
    cache = useQueryClient();
  const result = useInfiniteQuery({
    queryKey: ["store", business?.id, "notifications"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<StoreNotification[]>(
        `notifications?page=${pageParam}`,
        {},
        business?.id,
      ),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    enabled: !!business,
    refetchInterval: 30000,
  });
  async function read(n: StoreNotification) {
    await api(`notifications/${n.id}`, patch({}), business?.id);
    await cache.invalidateQueries({
      queryKey: ["store", business?.id, "notifications"],
    });
  }
  return (
    <Screen title="Notifications" back scroll={false}>
      <Heading
        title="What's happening."
        description={`${result.data?.pages[0]?.meta.unread ?? 0} unread alerts`}
      />
      <ErrorBox message={result.error?.message} />
      {result.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={result.data?.pages.flatMap((p) => p.data) ?? []}
          keyExtractor={(n) => String(n.id)}
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
          ListFooterComponent={result.isFetchingNextPage ? <Loading /> : null}
          ListEmptyComponent={
            <Card>
              <Label>You&apos;re all caught up.</Label>
            </Card>
          }
          renderItem={({ item: n }) => (
            <Card
              onPress={() => void read(n).catch(() => {})}
              style={{ opacity: n.read_at ? 0.65 : 1 }}
            >
              <View style={styles.split}>
                <Label>{n.kind.replaceAll("_", " ")}</Label>
                {!n.read_at && (
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 9,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>
              <Label>{n.message}</Label>
              <Label muted>{new Date(n.created_at).toLocaleString()}</Label>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
