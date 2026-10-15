import React from "react";
import { Image, View } from "react-native";
import { apiOrigin, money, sessionHeaders, units } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import type { Product } from "../lib/types";
import { Card, Icon, Label } from "./ui";
export function ProductRow({
  product: p,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const { business } = useAuth(),
    { colors, tr } = usePreferences();
  const statusColor =
    p.stock_status === "healthy"
      ? colors.primary
      : p.stock_status === "low"
        ? colors.warning
        : colors.danger;
  return (
    <Card onPress={onPress} style={{ padding: 15, borderRadius: 21 }}>
      <View style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
        {p.image_path ? (
          <Image
            source={{
              uri: `${apiOrigin()}${p.image_path}`,
              headers: sessionHeaders(business?.id),
            }}
            style={{ width: 55, height: 63, borderRadius: 15 }}
          />
        ) : (
          <View
            style={{
              width: 55,
              height: 63,
              borderRadius: 15,
              backgroundColor: colors.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="box" size={26} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Label size={14} weight="bold" numberOfLines={2}>
            {p.display_name || p.name}
          </Label>
          <Label muted size={12}>
            {money(p.selling_price, business?.currency)}
          </Label>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: statusColor,
              }}
            />
            <Label size={10} weight="semi" color={statusColor}>
              {tr(
                p.stock_status === "healthy"
                  ? "In stock"
                  : p.stock_status === "low"
                    ? "Low stock"
                    : "Out of stock",
              )}
            </Label>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 1 }}>
          <Label size={23} weight="extra" color={statusColor}>
            {units(p.current_stock)}
          </Label>
          <Label size={10} muted>
            {p.unit}
          </Label>
        </View>
        <Icon name="chevron" size={16} color={colors.muted} />
      </View>
    </Card>
  );
}
