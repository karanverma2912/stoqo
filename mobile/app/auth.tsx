import React, { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../lib/auth";
import { api, ApiError, post } from "../lib/api";
import { authValidationDetails, signupErrors, type AuthField, type AuthFieldErrors } from "../lib/auth-validation";
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
    [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  function updateField(field: AuthField, value: string) {
    if (field === "name") setName(value);
    else if (field === "email") setEmail(value);
    else setPassword(value);
    setError("");
    setFieldErrors((current) => current[field] ? {
      ...current,
      [field]: mode === "signup" ? signupErrors({ name, email, password, [field]: value })[field] : undefined,
    } : current);
  }
  async function submit() {
    setError("");
    setNotice("");
    const validation = mode === "signup" ? signupErrors({ name, email, password }) : {};
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    try {
      if (mode === "reset") {
        const result = await api<{ message: string }>(
          "auth/forgot_password",
          post({ email: email.trim() }),
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
      if (e instanceof ApiError) {
        const validation = authValidationDetails(e.details);
        setFieldErrors(validation.fields);
        setError(validation.message || (Object.keys(validation.fields).length ? "" : e.message));
      } else setError((e as Error).message);
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
              onChangeText={(value) => updateField("name", value)}
              error={fieldErrors.name}
              editable={!busy}
              autoComplete="name"
              maxLength={100}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={(value) => updateField("email", value)}
            error={fieldErrors.email}
            editable={!busy}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
          />
          {mode !== "reset" && (
            <Field
              key={mode}
              label="Password"
              value={password}
              onChangeText={(value) => updateField("password", value)}
              error={fieldErrors.password}
              hint={mode === "signup" ? "Use at least 12 characters." : undefined}
              editable={!busy}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
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
        </Card>
        <Row>
          <Button
            title={mode === "signup" ? "Sign in" : "Create account"}
            kind="soft"
            disabled={busy}
            onPress={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
              setNotice("");
              setFieldErrors({});
            }}
          />
          {mode !== "signup" && (
            <Button
              title={mode === "reset" ? "Back to sign in" : "Forgot password?"}
              kind="soft"
              disabled={busy}
              onPress={() => {
                setMode(mode === "reset" ? "login" : "reset");
                setError("");
                setNotice("");
                setFieldErrors({});
              }}
            />
          )}
        </Row>
      </FadeIn>
    </Screen>
  );
}
