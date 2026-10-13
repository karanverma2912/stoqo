import React from "react";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { permissions } from "../../lib/permissions";
import { Card, Heading, Label, Screen } from "../../components/ui";
export default function More() {
  const { business, user } = useAuth(),
    p = permissions(business?.role);
  const rows = [
    {
      title: "Bills & returns",
      description: "Your checkout history and refunds.",
      route: "/history",
    },
    {
      title: "Customers",
      description: "Find bills by customer phone.",
      route: "/customers",
    },
    ...(p.write
      ? [
          {
            title: "Suppliers & restocking",
            description: "Restock the right products.",
            route: "/suppliers",
          },
          {
            title: "Product variants",
            description: "Sizes, colours and barcode labels.",
            route: "/variants",
          },
        ]
      : []),
    ...(p.costs
      ? [
          {
            title: "Import inventory",
            description: "Bring your CSV or Excel sheet.",
            route: "/imports",
          },
        ]
      : []),
    ...(p.manage
      ? [
          {
            title: "Your team",
            description: "Invite employees and manage access.",
            route: "/team",
          },
          {
            title: "Daily overview",
            description: "Employee performance and payment totals.",
            route: "/reports",
          },
        ]
      : []),
    {
      title: "Notifications",
      description: "Store alerts and activity.",
      route: "/notifications",
    },
    {
      title: "Your stores",
      description: "Switch or open another store.",
      route: "/stores",
    },
    {
      title: "Settings",
      description: "Language, appearance, AI and security.",
      route: "/settings",
    },
  ];
  return (
    <Screen>
      <Heading
        title="Your workspace"
        description={`${user?.name ?? ""} · ${business?.role ?? ""}`}
      />
      {rows.map((row) => (
        <Card key={row.route} onPress={() => router.push(row.route as never)}>
          <Label>{row.title}</Label>
          <Label muted>{row.description}</Label>
        </Card>
      ))}
    </Screen>
  );
}
