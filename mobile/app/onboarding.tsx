import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { api, post } from "../lib/api";
import { usePreferences } from "../lib/preferences";
import {
  Brand,
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Icon,
  Label,
  Motion,
  Screen,
  Tap,
} from "../components/ui";
import type { IconName } from "../components/icon";

const businessTypes: {
  value: string;
  label: string;
  description: string;
  icon: IconName;
}[] = [
  {
    value: "retail",
    label: "Retail store",
    description: "Your everyday shop",
    icon: "store",
  },
  {
    value: "reseller",
    label: "Reseller",
    description: "Buy, sell and grow",
    icon: "bag",
  },
  {
    value: "home_business",
    label: "Home business",
    description: "Big ideas, small start",
    icon: "home",
  },
  {
    value: "wholesale",
    label: "Wholesale",
    description: "Stock in bigger numbers",
    icon: "box",
  },
];

export default function Onboarding() {
  const { user, newStore, refresh, signOut } = useAuth(),
    { colors } = usePreferences();
  const [name, setName] = useState(""),
    [type, setType] = useState("retail"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const needsVerify =
    user?.email_verification_required && !user.email_verified_at;
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Brand />
      <Motion>
        <View
          style={{
            width: 66,
            height: 66,
            borderRadius: 23,
            backgroundColor: colors.soft,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 13,
            marginBottom: 15,
          }}
        >
          <Icon
            name={needsVerify ? "mail" : "store"}
            color={colors.primary}
            size={31}
          />
        </View>
        <Label
          size={11}
          weight="bold"
          color={colors.primary}
          style={{ letterSpacing: 1.3, marginBottom: 7 }}
        >
          {needsVerify ? "ONE QUICK CHECK" : "LET'S SETTLE YOU IN"}
        </Label>
        <Heading
          title={
            needsVerify
              ? "Check your inbox."
              : "Make room for\nyour next chapter."
          }
          description={
            needsVerify
              ? `We sent a verification link to ${user?.email}. Open it, then come back here.`
              : "Give your store a name. We'll take care of the workspace."
          }
        />
      </Motion>
      <ErrorBox message={error} />
      {notice ? (
        <Card style={{ backgroundColor: colors.soft }}>
          <Label>{notice}</Label>
        </Card>
      ) : null}
      {needsVerify ? (
        <Card>
          <Button
            title="I've verified my email"
            trailingIcon="arrow"
            busy={busy}
            onPress={() => void run(refresh)}
          />
          <Button
            title="Resend verification"
            icon="mail"
            kind="soft"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await api("auth/request_verification", post({}));
                setNotice("A verification link has been sent.");
              })
            }
          />
        </Card>
      ) : (
        <Motion delay={80} style={{ gap: 21 }}>
          <Field
            label="Store name"
            placeholder="e.g. The Corner Store"
            icon="store"
            value={name}
            onChangeText={setName}
            maxLength={120}
            editable={!busy}
            autoCapitalize="words"
          />
          <View style={{ gap: 11 }}>
            <Label weight="bold">What kind of business?</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 11 }}>
              {businessTypes.map((item) => {
                const active = type === item.value;
                return (
                  <Tap
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active, disabled: busy }}
                    disabled={busy}
                    onPress={() => setType(item.value)}
                    style={{
                      flexBasis: "46%",
                      flexGrow: 1,
                      padding: 16,
                      borderRadius: 21,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.line,
                      backgroundColor: active ? colors.soft : colors.card,
                      gap: 7,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 7,
                      }}
                    >
                      <Icon name={item.icon} color={colors.primary} size={24} />
                      {active ? (
                        <Icon name="check" size={17} color={colors.primary} />
                      ) : null}
                    </View>
                    <Label size={13} weight="bold">
                      {item.label}
                    </Label>
                    <Label size={10} muted>
                      {item.description}
                    </Label>
                  </Tap>
                );
              })}
            </View>
          </View>
          <Button
            title="Create my store"
            trailingIcon="arrow"
            busy={busy}
            disabled={!name.trim()}
            onPress={() =>
              void run(async () => {
                await newStore(name.trim(), type);
                router.replace("/(tabs)");
              })
            }
          />
        </Motion>
      )}
      <View style={{ gap: 8, paddingVertical: 9 }}>
        <Label weight="bold" size={12}>
          Joining someone else&apos;s store?
        </Label>
        <Label muted size={12}>
          Open the invitation email and use the invited email address. Your
          access starts as soon as you accept.
        </Label>
        <Button
          title="Sign out"
          kind="soft"
          icon="logout"
          disabled={busy}
          onPress={() => void signOut()}
        />
      </View>
    </Screen>
  );
}
