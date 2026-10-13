import React, { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Screen,
} from "../components/ui";
export default function Stores() {
  const { business, businesses, selectBusiness, newStore } = useAuth(),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    try {
      await newStore(name, "retail");
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Your stores" back>
      <Heading title="Pick your workspace" />
      {businesses.map((b) => (
        <Card
          key={b.id}
          onPress={() =>
            void selectBusiness(b.id)
              .then(() => router.replace("/(tabs)"))
              .catch((e) => setError(e.message))
          }
        >
          <Label>{`${b.name}${business?.id === b.id ? " ✓" : ""}`}</Label>
          <Label muted>{b.role}</Label>
        </Card>
      ))}
      <Card>
        <Field label="New store name" value={name} onChangeText={setName} />
        <Button
          title="Create store"
          busy={busy}
          disabled={!name.trim()}
          onPress={() => void create()}
        />
      </Card>
      <ErrorBox message={error} />
    </Screen>
  );
}
