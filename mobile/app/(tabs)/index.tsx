import React from "react";
import { View, Text, RefreshControl, ScrollView } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { api, units } from "../../lib/api";
import { permissions } from "../../lib/permissions";
import { usePreferences } from "../../lib/preferences";
import {
  Button,
  Card,
  ErrorBox,
  FadeIn,
  Heading,
  Label,
  Loading,
  Row,
  Screen,
  styles,
} from "../../components/ui";
import type { Product } from "../../lib/types";
type Dashboard = {
  products: number;
  total_units: string;
  low_stock: number;
  out_of_stock: number;
  retail_value: string;
  low_products: Product[];
};
export default function Home() {
  const { business, user } = useAuth(),
    { colors, tr } = usePreferences();
  const result = useQuery({
    queryKey: ["store", business?.id, "dashboard"],
    queryFn: () => api<Dashboard>("dashboard", {}, business?.id),
    enabled: !!business,
    refetchInterval: 45000,
  });
  const d = result.data?.data;
  return (
    <Screen scroll={false}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={result.isFetching && !result.isLoading}
            onRefresh={() => void result.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ gap: 18, paddingBottom: 30 }}
      >
        <FadeIn>
          <View style={styles.split}>
            <View>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "900",
                  letterSpacing: -1.5,
                  color: colors.primary,
                }}
              >
                stoqo.
              </Text>
              <Label muted>{`Hi ${user?.name?.split(" ")[0] ?? ""}`}</Label>
            </View>
            <Button
              title="Notifications"
              kind="soft"
              onPress={() => router.push("/notifications")}
            />
          </View>
          <Card
            onPress={() => router.push("/stores")}
            style={{ backgroundColor: colors.primary, borderWidth: 0 }}
          >
            <View style={styles.split}>
              <View>
                <Text
                  style={{
                    color: colors.onPrimary,
                    fontSize: 12,
                    opacity: 0.8,
                  }}
                >
                  {business?.role?.toUpperCase()}
                </Text>
                <Text
                  style={{
                    color: colors.onPrimary,
                    fontWeight: "800",
                    fontSize: 22,
                    marginTop: 4,
                  }}
                >
                  {business?.name}
                </Text>
              </View>
              <Text style={{ color: colors.onPrimary, fontSize: 25 }}>⌄</Text>
            </View>
          </Card>
          <Heading
            title="Today at a glance"
            description="A clear view of your store."
          />
          {result.isLoading && <Loading />}
          <ErrorBox message={result.error?.message} />
          {d && (
            <>
              <View style={styles.grid}>
                {[
                  { label: "Products", value: d.products },
                  { label: "Stock units", value: units(d.total_units) },
                  { label: "Low stock", value: d.low_stock },
                  { label: "Out of stock", value: d.out_of_stock },
                ].map((item) => (
                  <Card key={item.label} style={{ width: "47%", flexGrow: 1 }}>
                    <Label muted>{item.label}</Label>
                    <Text
                      style={{
                        fontSize: 30,
                        color: colors.ink,
                        fontWeight: "800",
                      }}
                    >
                      {item.value}
                    </Text>
                  </Card>
                ))}
              </View>
              <Row>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Scan & sell"
                    onPress={() => router.push("/scan?mode=cart")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Add stock"
                    kind="soft"
                    onPress={() => router.push("/(tabs)/inventory")}
                  />
                </View>
              </Row>
              {permissions(business?.role).manage && (
                <Card onPress={() => router.push("/reports")}>
                  <Label>Daily employee summary</Label>
                  <Label muted>
                    Sales, payment totals and returns in one place.
                  </Label>
                </Card>
              )}
              <Heading title="Needs a little attention" />
              {d.low_products.length ? (
                d.low_products.map((p) => (
                  <Card
                    key={p.id}
                    onPress={() => router.push(`/product/${p.id}`)}
                  >
                    <View style={styles.split}>
                      <View style={styles.grow}>
                        <Label>{p.display_name || p.name}</Label>
                        <Label
                          muted
                        >{`${units(p.current_stock)} ${p.unit} left`}</Label>
                      </View>
                      <Text style={{ color: colors.danger, fontWeight: "700" }}>
                        {tr(
                          p.stock_status === "out"
                            ? "Out of stock"
                            : "Low stock",
                        )}
                      </Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Card>
                  <Label>All set</Label>
                  <Label muted>
                    Your products are above their low-stock thresholds.
                  </Label>
                </Card>
              )}
            </>
          )}
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}
