import React from "react";
import { View, RefreshControl, ScrollView } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { api, money, units } from "../../lib/api";
import { permissions } from "../../lib/permissions";
import { usePreferences } from "../../lib/preferences";
import {
  Brand,
  Card,
  EmptyState,
  ErrorBox,
  Icon,
  IconButton,
  Label,
  Loading,
  Motion,
  Screen,
  SectionTitle,
  Tap,
  styles,
} from "../../components/ui";
import { ProductRow } from "../../components/product-row";
import type { Product } from "../../lib/types";
import type { IconName } from "../../components/icon";
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
  const p = permissions(business?.role);
  const result = useQuery({
    queryKey: ["store", business?.id, "dashboard"],
    queryFn: () => api<Dashboard>("dashboard", {}, business?.id),
    enabled: !!business,
    refetchInterval: 45000,
  });
  const d = result.data?.data;
  const hour = new Date().getHours(),
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
  const actions: { title: string; icon: IconName; route: string }[] = [
    { title: "Scan & sell", icon: "scan", route: "/scan?mode=cart" },
    { title: "New sale", icon: "bag", route: "/(tabs)/sell" },
    p.stock
      ? { title: "Add product", icon: "plus", route: "/product/new" }
      : { title: "Inventory", icon: "box", route: "/(tabs)/inventory" },
  ];
  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={result.isFetching && !result.isLoading}
            onRefresh={() => void result.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ gap: 22, paddingBottom: 25 }}
      >
        <View style={styles.split}>
          <Brand />
          <IconButton
            name="bell"
            label="Notifications"
            onPress={() => router.push("/notifications")}
          />
        </View>
        <Motion>
          <View style={{ gap: 4 }}>
            <Label
              muted
              size={13}
            >{`${tr(greeting)}, ${user?.name?.split(" ")[0] ?? ""}`}</Label>
            <Label size={28} weight="extra" style={{ letterSpacing: -1 }}>
              {"Let's make today\na good one."}
            </Label>
          </View>
        </Motion>
        <Motion delay={70}>
          <Card
            style={{
              backgroundColor: colors.hero,
              borderWidth: 0,
              padding: 23,
              gap: 23,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: -65,
                bottom: -103,
                width: 245,
                height: 245,
                borderRadius: 130,
                borderWidth: 1,
                borderColor: "#4A6653",
              }}
            />
            <Tap
              accessibilityRole="button"
              accessibilityLabel="Switch store"
              onPress={() => router.push("/stores")}
              style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
            >
              <Icon name="store" size={17} color={colors.accent} />
              <Label
                size={12}
                weight="bold"
                color={colors.heroInk}
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {business?.name ?? "Your store"}
              </Label>
              <Icon name="down" size={17} color={colors.heroInk} />
            </Tap>
            <View style={{ gap: 3 }}>
              <Label size={12} color="#C3D5C6">
                Inventory retail value
              </Label>
              <Label
                size={35}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
                weight="extra"
                color={colors.heroInk}
                style={{ letterSpacing: -1.1 }}
              >
                {d ? money(d.retail_value, business?.currency) : "—"}
              </Label>
            </View>
            <View
              style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
            >
              <Label size={11} color={colors.accent}>
                {d ? `${d.products} ${tr("products")}` : "—"}
              </Label>
              <View
                style={{ width: 1, height: 12, backgroundColor: "#4A6653" }}
              />
              <Label size={11} color="#C3D5C6">
                {d ? `${units(d.total_units)} ${tr("stock units")}` : "—"}
              </Label>
            </View>
          </Card>
        </Motion>
        <Motion delay={120}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {actions.map((action) => (
              <Tap
                key={action.title}
                accessibilityRole="button"
                onPress={() => router.push(action.route as never)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  gap: 10,
                  borderRadius: 21,
                  backgroundColor: colors.card,
                  borderColor: colors.line,
                  borderWidth: 1,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 41,
                    height: 41,
                    borderRadius: 14,
                    backgroundColor: colors.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={action.icon} color={colors.primary} size={21} />
                </View>
                <Label size={10} weight="bold" style={{ textAlign: "center" }}>
                  {action.title}
                </Label>
              </Tap>
            ))}
          </View>
        </Motion>
        <ErrorBox message={result.error?.message} />
        {result.isLoading ? <Loading /> : null}
        {d ? (
          <>
            <Motion delay={160}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  {
                    label: "Low stock",
                    value: d.low_stock,
                    color: colors.warning,
                  },
                  {
                    label: "Out of stock",
                    value: d.out_of_stock,
                    color: colors.danger,
                  },
                ].map((item) => (
                  <Card key={item.label} style={{ flex: 1, gap: 13 }}>
                    <View style={styles.split}>
                      <Icon name="warning" color={item.color} size={19} />
                      <Label size={28} weight="extra">
                        {item.value}
                      </Label>
                    </View>
                    <Label size={12} muted>
                      {item.label}
                    </Label>
                  </Card>
                ))}
              </View>
            </Motion>
            <SectionTitle
              title="A little attention"
              action="View inventory"
              onAction={() => router.push("/(tabs)/inventory")}
            />
            {d.low_products.length ? (
              d.low_products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onPress={() => router.push(`/product/${product.id}`)}
                />
              ))
            ) : (
              <Card>
                <EmptyState
                  icon="leaf"
                  title="Looking good."
                  description="Your products are above their low-stock thresholds."
                />
              </Card>
            )}
            {p.manage ? (
              <Card
                onPress={() => router.push("/reports")}
                style={{ backgroundColor: colors.soft, borderWidth: 0 }}
              >
                <View style={styles.split}>
                  <View style={{ gap: 5, flex: 1 }}>
                    <Label weight="bold">See the bigger picture</Label>
                    <Label muted size={12}>
                      Sales, your team, and today&apos;s totals.
                    </Label>
                  </View>
                  <Icon name="chart" size={30} color={colors.primary} />
                </View>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
