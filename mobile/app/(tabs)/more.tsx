import React from "react";
import { View } from "react-native";
import { router, type Href } from "expo-router";
import { useAuth } from "../../lib/auth";
import { permissions } from "../../lib/permissions";
import { usePreferences } from "../../lib/preferences";
import {
  Card,
  Heading,
  Icon,
  Label,
  Motion,
  Screen,
  SectionTitle,
  Tap,
} from "../../components/ui";
import type { IconName } from "../../components/icon";

type MenuItem = {
  title: string;
  description: string;
  route: Href;
  icon: IconName;
};

function MenuGroup({ title, rows }: { title: string; rows: MenuItem[] }) {
  const { colors } = usePreferences();
  if (!rows.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title={title} />
      <Card style={{ padding: 5, gap: 0 }}>
        {rows.map((row, index) => (
          <Tap
            key={String(row.route)}
            accessibilityRole="button"
            onPress={() => router.push(row.route)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              padding: 14,
              minHeight: 78,
              borderBottomWidth: index < rows.length - 1 ? 1 : 0,
              borderBottomColor: colors.line,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: colors.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={row.icon} color={colors.primary} size={21} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Label weight="bold">{row.title}</Label>
              <Label muted size={11}>
                {row.description}
              </Label>
            </View>
            <Icon name="chevron" color={colors.muted} size={17} />
          </Tap>
        ))}
      </Card>
    </View>
  );
}

export default function More() {
  const { business, user } = useAuth(),
    { colors } = usePreferences(),
    p = permissions(business?.role);
  const operations: MenuItem[] = [
    ...(p.write
      ? [
          {
            title: "Suppliers & restocking",
            description: "Keep your shelves ready.",
            route: "/suppliers" as Href,
            icon: "truck" as const,
          },
          {
            title: "Product variants",
            description: "Sizes, colours and barcodes.",
            route: "/variants" as Href,
            icon: "box" as const,
          },
        ]
      : []),
    ...(p.costs
      ? [
          {
            title: "Import inventory",
            description: "Bring your CSV or Excel sheet.",
            route: "/imports" as Href,
            icon: "download" as const,
          },
        ]
      : []),
    ...(p.manage
      ? [
          {
            title: "Your team",
            description: "People, roles and access.",
            route: "/team" as Href,
            icon: "team" as const,
          },
          {
            title: "Daily overview",
            description: "Sales, payments and performance.",
            route: "/reports" as Href,
            icon: "chart" as const,
          },
        ]
      : []),
  ];
  const initials = (user?.name ?? "S")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Screen>
      <Motion>
        <Heading
          title="Your workspace"
          description="Everything your store needs, together."
        />
      </Motion>
      <Motion delay={50}>
        <Card
          onPress={() => router.push("/stores")}
          style={{
            backgroundColor: colors.hero,
            borderColor: colors.hero,
            gap: 17,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
            <View
              style={{
                width: 51,
                height: 51,
                borderRadius: 18,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Label color={colors.hero} size={18} weight="extra">
                {initials}
              </Label>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Label
                color={colors.heroInk}
                weight="extra"
                size={17}
                numberOfLines={1}
              >
                {user?.name ?? "Your account"}
              </Label>
              <Label
                color={colors.heroInk}
                size={11}
                style={{ opacity: 0.7, textTransform: "capitalize" }}
              >
                {business?.role ?? "Member"}
              </Label>
            </View>
            <Icon name="chevron" color={colors.heroInk} size={19} />
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#FFFFFF20",
              paddingTop: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
            }}
          >
            <Icon name="store" size={17} color={colors.accent} />
            <Label
              color={colors.heroInk}
              size={12}
              style={{ flex: 1 }}
              numberOfLines={1}
            >
              {business?.name ?? "Your stores"}
            </Label>
            <Label color={colors.accent} size={11} weight="bold">
              Switch store
            </Label>
          </View>
        </Card>
      </Motion>
      <Motion delay={90}>
        <MenuGroup
          title="Sales & people"
          rows={[
            {
              title: "Bills & returns",
              description: "Every sale, easy to find.",
              route: "/history",
              icon: "receipt",
            },
            {
              title: "Customers",
              description: "Find bills by customer phone.",
              route: "/customers",
              icon: "user",
            },
          ]}
        />
      </Motion>
      <MenuGroup title="Store tools" rows={operations} />
      <MenuGroup
        title="Make it yours"
        rows={[
          {
            title: "Notifications",
            description: "Store alerts and activity.",
            route: "/notifications",
            icon: "bell",
          },
          {
            title: "Your stores",
            description: "Switch or open another store.",
            route: "/stores",
            icon: "store",
          },
          {
            title: "Settings",
            description: "Language, appearance and security.",
            route: "/settings",
            icon: "settings",
          },
        ]}
      />
      <Label
        muted
        size={11}
        style={{ textAlign: "center", paddingVertical: 5 }}
      >
        A little more organised. Every day.
      </Label>
    </Screen>
  );
}
