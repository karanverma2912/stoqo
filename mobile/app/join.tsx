import React, { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../lib/auth";
import { tokenFromLink, validToken } from "../lib/link-token";
import {
  Button,
  Card,
  ErrorBox,
  Heading,
  Label,
  Screen,
} from "../components/ui";
export default function Join() {
  const { user, acceptInvitation, signOut } = useAuth();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const url = Linking.useURL();
  useEffect(() => {
    void (async () => {
      let raw = params.token ?? "";
      if (!raw && url) {
        try {
          raw = tokenFromLink(url);
        } catch {}
      }
      raw =
        raw ||
        (await SecureStore.getItemAsync("stoqo.pending-invitation")) ||
        "";
      if (validToken(raw)) {
        await SecureStore.setItemAsync("stoqo.pending-invitation", raw);
        setToken(raw);
      } else setError("Open a valid invitation link from your store owner.");
    })();
  }, [params.token, url]);
  async function join() {
    setBusy(true);
    setError("");
    try {
      await acceptInvitation(token);
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading
        title="Join your store."
        description="Use the email address your store owner invited."
      />
      <Card>
        {user ? (
          <>
            <Label>{user.email}</Label>
            <Button
              title="Accept invitation"
              busy={busy}
              disabled={!token}
              onPress={() => void join()}
            />
            <Button
              title="Use another account"
              kind="soft"
              onPress={() => void signOut().then(() => router.replace("/auth"))}
            />
          </>
        ) : (
          <>
            <Label>
              Your invitation is ready. Sign in or create an account to start
              working.
            </Label>
            <Button
              title="Continue"
              disabled={!token}
              onPress={() => router.replace("/auth")}
            />
          </>
        )}
        <ErrorBox message={error} />
      </Card>
    </Screen>
  );
}
