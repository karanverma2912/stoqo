import React, { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { api, post } from "../lib/api";
import { tokenFromLink, validToken } from "../lib/link-token";
import { useAuth } from "../lib/auth";
import {
  Button,
  ErrorBox,
  Heading,
  Label,
  Loading,
  Screen,
} from "../components/ui";
export default function Verify() {
  const params = useLocalSearchParams<{ token?: string }>(),
    url = Linking.useURL(),
    { user, refresh } = useAuth();
  const [error, setError] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    let token = params.token ?? "";
    try {
      if (!token && url) token = tokenFromLink(url);
    } catch {}
    if (!token) return;
    void Promise.resolve()
      .then(() => {
        if (!validToken(token))
          throw new Error("This verification link is invalid.");
        return api("auth/verify_email", post({ token }));
      })
      .then(async () => {
        if (user) await refresh();
        setDone(true);
      })
      .catch((e) => setError(e.message));
  }, [params.token, url]);
  return (
    <Screen>
      <Heading title="Email verification" />
      <ErrorBox message={error} />
      {done ? (
        <>
          <Label>Your email is verified.</Label>
          <Button title="Continue" onPress={() => router.replace("/")} />
        </>
      ) : !error ? (
        <Loading />
      ) : null}
    </Screen>
  );
}
