import React, { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { api, post } from "../lib/api";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Pill,
  Row,
  Screen,
} from "../components/ui";
export default function Onboarding() {
  const { user, newStore, refresh, signOut } = useAuth();
  const [name, setName] = useState(""),
    [type, setType] = useState("retail"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const needsVerify =
    user?.email_verification_required && !user.email_verified_at;
  async function run(action: () => Promise<void>) {
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
      <Heading
        title={needsVerify ? "Verify your email" : "Create your store"}
        description={
          needsVerify
            ? `Check ${user?.email} for your verification link.`
            : "A little setup. A lot more clarity."
        }
      />
      <ErrorBox message={error} />
      {notice && <Label>{notice}</Label>}
      {needsVerify ? (
        <Card>
          <Button
            title="Resend verification"
            busy={busy}
            onPress={() =>
              void run(async () => {
                await api("auth/request_verification", post({}));
                setNotice("A verification link has been sent.");
              })
            }
          />
          <Button
            title="Check verification"
            kind="soft"
            onPress={() => void run(refresh)}
          />
        </Card>
      ) : (
        <Card>
          <Field
            label="Store name"
            value={name}
            onChangeText={setName}
            maxLength={120}
          />
          <Label>Business type</Label>
          <Row>
            {["retail", "reseller", "home_business", "wholesale"].map(
              (value) => (
                <Pill
                  key={value}
                  label={value.replace("_", " ")}
                  active={type === value}
                  onPress={() => setType(value)}
                />
              ),
            )}
          </Row>
          <Button
            title="Open a store"
            busy={busy}
            disabled={!name.trim()}
            onPress={() =>
              void run(async () => {
                await newStore(name.trim(), type);
                router.replace("/(tabs)");
              })
            }
          />
        </Card>
      )}
      <Card>
        <Label>Joining someone else&apos;s store?</Label>
        <Label muted>
          Open the invitation email and use the invited email address. Your
          access starts as soon as you accept.
        </Label>
        <Button title="Sign out" kind="soft" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}
