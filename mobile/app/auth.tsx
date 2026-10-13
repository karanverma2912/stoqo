import React, { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../lib/auth";
import { api, post } from "../lib/api";
import { usePreferences } from "../lib/preferences";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Row,
  Screen,
  FadeIn,
} from "../components/ui";
export default function Auth() {
  const auth = useAuth(),
    { colors } = usePreferences();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "reset") {
        const result = await api<{ message: string }>(
          "auth/forgot_password",
          post({ email }),
        );
        setNotice(result.data.message);
      } else {
        if (mode === "signup") await auth.signUp(name, email, password);
        else await auth.signIn(email, password);
        const invite = await SecureStore.getItemAsync(
          "stoqo.pending-invitation",
        );
        router.replace(invite ? "/join" : "/");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <FadeIn>
        <View style={{ paddingVertical: 30, gap: 12 }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 51,
              fontWeight: "900",
              letterSpacing: -3,
            }}
          >
            stoqo.
          </Text>
          <Label>Your stock. In a good place.</Label>
        </View>
        <Heading
          title={
            mode === "signup"
              ? "Create your account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome back."
          }
          description="One account for your stores, team and everyday sales."
        />
        <Card>
          {mode === "signup" && (
            <Field
              label="Your name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={100}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
          />
          {mode !== "reset" && (
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          )}
          <ErrorBox message={error || auth.error} />
          {notice && <Label>{notice}</Label>}
          <Button
            title={
              mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"
            }
            busy={busy}
            disabled={
              !email ||
              (mode !== "reset" && !password) ||
              (mode === "signup" && !name)
            }
            onPress={() => void submit()}
          />
          {mode === "signup" && (
            <Label muted>Choose a password with at least 12 characters.</Label>
          )}
        </Card>
        <Row>
          <Button
            title={mode === "signup" ? "Sign in" : "Create account"}
            kind="soft"
            onPress={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
              setNotice("");
            }}
          />
          {mode !== "signup" && (
            <Button
              title={mode === "reset" ? "Back to sign in" : "Forgot password?"}
              kind="soft"
              onPress={() => {
                setMode(mode === "reset" ? "login" : "reset");
                setError("");
              }}
            />
          )}
        </Row>
      </FadeIn>
    </Screen>
  );
}
