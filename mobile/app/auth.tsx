import React, { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { AuthHero } from "../components/auth-hero";
import { softLayout } from "../components/motion";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../lib/auth";
import { api, ApiError, post } from "../lib/api";
import {
  authValidationDetails,
  signupErrors,
  type AuthField,
  type AuthFieldErrors,
} from "../lib/auth-validation";
import { usePreferences } from "../lib/preferences";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Label,
  Screen,
  Segmented,
  Motion,
  Tap,
  Icon,
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
    setFieldErrors((current) =>
      current[field]
        ? {
            ...current,
            [field]:
              mode === "signup"
                ? signupErrors({ name, email, password, [field]: value })[field]
                : undefined,
          }
        : current,
    );
  }
  function changeMode(next: "login" | "signup" | "reset") {
    setMode(next);
    setError("");
    setNotice("");
    setFieldErrors({});
  }
  async function submit() {
    if (busy) return;
    setError("");
    setNotice("");
    const validation: AuthFieldErrors =
      mode === "signup"
        ? signupErrors({ name, email, password })
        : {
            ...(!email.trim() ? { email: "Enter your email." } : {}),
            ...(mode === "login" && !password
              ? { password: "Enter your password." }
              : {}),
          };
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
        setError(
          validation.message ||
            (Object.keys(validation.fields).length ? "" : e.message),
        );
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Motion>
        <AuthHero />
      </Motion>
      {mode !== "reset" ? (
        <Segmented
          options={[
            { value: "login", label: "Sign in" },
            { value: "signup", label: "Create account" },
          ]}
          value={mode}
          disabled={busy}
          onChange={(value) => changeMode(value as "login" | "signup")}
        />
      ) : (
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          disabled={busy}
          onPress={() => changeMode("login")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            minHeight: 44,
          }}
        >
          <Icon name="back" size={18} color={colors.primary} />
          <Label weight="bold" color={colors.primary}>
            Back to sign in
          </Label>
        </Tap>
      )}
      <Animated.View layout={softLayout}>
        <Motion key={mode}>
          <Card style={{ padding: 23, gap: 19 }}>
            <View style={{ gap: 5, marginBottom: 2 }}>
              <Label size={24} weight="extra" style={{ letterSpacing: -0.8 }}>
                {mode === "signup"
                  ? "Make room for growth."
                  : mode === "reset"
                    ? "Let's get you back in."
                    : "Welcome back."}
              </Label>
              <Label muted size={12}>
                {mode === "signup"
                  ? "Create one account for all your stores."
                  : mode === "reset"
                    ? "We'll send a reset link to your email."
                    : "Your store is ready when you are."}
              </Label>
            </View>
            {mode === "signup" ? (
              <Field
                label="Your name"
                icon="user"
                placeholder="Enter your full name"
                value={name}
                onChangeText={(value) => updateField("name", value)}
                error={fieldErrors.name}
                editable={!busy}
                autoComplete="name"
                maxLength={100}
              />
            ) : null}
            <Field
              label="Email address"
              icon="mail"
              placeholder="you@yourstore.com"
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
            {mode !== "reset" ? (
              <Field
                key={mode}
                label="Password"
                placeholder={
                  mode === "signup"
                    ? "Choose a secure password"
                    : "Enter your password"
                }
                value={password}
                onChangeText={(value) => updateField("password", value)}
                error={fieldErrors.password}
                hint={
                  mode === "signup" ? "Use at least 12 characters." : undefined
                }
                editable={!busy}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />
            ) : null}
            {mode === "login" ? (
              <Tap
                accessibilityRole="button"
                disabled={busy}
                onPress={() => changeMode("reset")}
                style={{
                  alignSelf: "flex-end",
                  paddingVertical: 7,
                  minHeight: 32,
                }}
                hitSlop={6}
              >
                <Label size={12} weight="bold" color={colors.primary}>
                  Forgot password?
                </Label>
              </Tap>
            ) : null}
            <ErrorBox message={error || auth.error} />
            {notice ? (
              <View
                style={{
                  backgroundColor: colors.soft,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <Label size={13}>{notice}</Label>
              </View>
            ) : null}
            <Button
              title={
                mode === "signup"
                  ? "Create my account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Let's go"
              }
              trailingIcon="arrow"
              busy={busy}
              disabled={
                !email ||
                (mode !== "reset" && !password) ||
                (mode === "signup" && !name)
              }
              onPress={() => void submit()}
            />
          </Card>
        </Motion>
      </Animated.View>
      <View style={{ alignItems: "center", paddingBottom: 10 }}>
        <Label muted size={11}>
          One account. Every store.
        </Label>
      </View>
    </Screen>
  );
}
