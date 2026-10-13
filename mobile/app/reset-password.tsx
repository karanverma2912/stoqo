import React, { useState } from "react";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { api, post } from "../lib/api";
import { tokenFromLink, validToken } from "../lib/link-token";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Screen,
} from "../components/ui";
export default function Reset() {
  const { token: parameter } = useLocalSearchParams<{ token?: string }>(),
    url = Linking.useURL();
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const token = parameter || (url ? tokenFromLink(url) : "");
      if (!validToken(token))
        throw new Error("Open a valid password reset link.");
      await api(
        "auth/reset_password",
        post({ token, password, password_confirmation: confirmation }),
      );
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading title="Reset your password" />
      {done ? (
        <>
          <Label>Your password has been reset.</Label>
          <Button title="Sign in" onPress={() => router.replace("/auth")} />
        </>
      ) : (
        <Card>
          <Field
            label="New password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Field
            label="Confirm password"
            secureTextEntry
            value={confirmation}
            onChangeText={setConfirmation}
          />
          <ErrorBox message={error} />
          <Button
            title="Save password"
            busy={busy}
            disabled={password.length < 12 || password !== confirmation}
            onPress={() => void submit()}
          />
        </Card>
      )}
    </Screen>
  );
}
