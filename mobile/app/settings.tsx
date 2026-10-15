import React, { useState } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api, patch, post, saveSession, webOrigin } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { permissions } from "../lib/permissions";
import { registerPush, unregisterPush } from "../lib/push";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  SectionTitle,
  Segmented,
  Row,
  Screen,
  confirm,
} from "../components/ui";
export default function Settings() {
  const { user, business, refresh, signOut } = useAuth(),
    prefs = usePreferences(),
    cache = useQueryClient(),
    p = permissions(business?.role);
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [deleteMode, setDeleteMode] = useState(false),
    [confirmation, setConfirmation] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const web = webOrigin();
  return (
    <Screen title="Settings" back>
      <Heading title={user?.name ?? "Your account"} description={user?.email} />
      <ErrorBox message={error} />
      {notice ? <Label>{notice}</Label> : null}
      <Card>
        <SectionTitle title="Make it feel like you" />
        <Label weight="bold" size={12}>
          Language
        </Label>
        <Segmented
          options={[
            { value: "en", label: "English" },
            { value: "hi", label: "हिन्दी" },
          ]}
          value={prefs.language}
          onChange={(value) => prefs.setLanguage(value as "en" | "hi")}
        />
        <Label weight="bold" size={12}>
          Appearance
        </Label>
        <Segmented
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={prefs.theme}
          onChange={(value) =>
            prefs.setTheme(value as "system" | "light" | "dark")
          }
        />
      </Card>
      <Card>
        <SectionTitle title="Background alerts" />
        <Label muted>
          Receive store activity on each phone where you are signed in.
        </Label>
        <Button
          title="Enable notifications"
          busy={busy}
          onPress={() =>
            void run(async () => {
              if (!(await registerPush())) return;
              setNotice("Background alerts enabled on this phone.");
            })
          }
        />
        <Button
          title="Disable on this phone"
          kind="soft"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await unregisterPush();
              setNotice("Background alerts disabled on this phone.");
            })
          }
        />
      </Card>
      {p.manage && (
        <Card>
          <SectionTitle title="Store AI assistant" />
          <Label muted>
            When enabled, your questions and permitted store data are sent to
            Google Gemini. Customer contact details, passwords and login tokens
            are excluded from Stoqo tools. Google&apos;s free API tier may use
            submitted content to improve its products.
          </Label>
          <Button
            title={business?.ai_enabled ? "Disable AI" : "Enable AI"}
            kind="soft"
            disabled={busy}
            onPress={() =>
              confirm(
                business?.ai_enabled
                  ? "Disable the assistant?"
                  : "Enable AI for this store?",
                "Store members can ask questions using the inventory and team information their roles allow. Tasks require confirmation.",
                () =>
                  void run(async () => {
                    await api(
                      `businesses/${business?.id}`,
                      patch({
                        business: { ai_enabled: !business?.ai_enabled },
                      }),
                      business?.id,
                    );
                    await refresh();
                    await cache.invalidateQueries({
                      queryKey: [
                        "store",
                        business?.id,
                        "assistant-capabilities",
                      ],
                    });
                  }),
              )
            }
          />
        </Card>
      )}
      <Card>
        <SectionTitle title="Account security" />
        <Field
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
        />
        <Field
          label="New password"
          hint="Use at least 12 characters."
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          title="Change password"
          busy={busy}
          disabled={!current || password.length < 12}
          onPress={() =>
            void run(async () => {
              const result = await api<{ token: string }>(
                "auth/change_password",
                post({
                  current_password: current,
                  password,
                  password_confirmation: password,
                }),
              );
              await saveSession(result.data.token);
              setCurrent("");
              setPassword("");
              setNotice(
                "Password changed. Other devices have been signed out.",
              );
              await refresh();
            })
          }
        />
        <Button
          title="Sign out other devices"
          kind="soft"
          disabled={busy || !current}
          onPress={() =>
            void run(async () => {
              await api(
                "auth/revoke_other_sessions",
                post({ current_password: current }),
              );
              setNotice("Other devices have been signed out.");
            })
          }
        />
        {!user?.email_verified_at && (
          <Button
            title="Resend verification"
            kind="soft"
            onPress={() =>
              void run(async () => {
                await api("auth/request_verification", post({}));
                setNotice("Check your email for a verification link.");
              })
            }
          />
        )}
      </Card>
      <Card>
        <SectionTitle title="Privacy & support" />
        {web && (
          <Row>
            <Button
              title="Privacy policy"
              kind="soft"
              onPress={() => void Linking.openURL(`${web}/privacy`)}
            />
            <Button
              title="Support"
              kind="soft"
              onPress={() => void Linking.openURL(`${web}/support`)}
            />
          </Row>
        )}
        <Button
          title="Sign out"
          kind="soft"
          onPress={() => void run(signOut)}
        />
        <Button
          title="Delete my account"
          kind="danger"
          onPress={() => setDeleteMode(!deleteMode)}
        />
        {deleteMode && (
          <>
            <Label>
              Deleting your account permanently closes and deletes every store
              you own, including its stock, bills, uploads and employee access.
              Your profile is anonymized in other stores&apos; historical audit
              records.
            </Label>
            <Field
              label="Type DELETE to confirm"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
            />
            <Button
              title="Delete account and owned stores"
              kind="danger"
              busy={busy}
              disabled={confirmation !== "DELETE" || !current}
              onPress={() =>
                confirm(
                  "Permanently delete your account?",
                  "Your owned stores and their data will be removed. This cannot be undone.",
                  () =>
                    void run(async () => {
                      await api("auth/account", {
                        method: "DELETE",
                        body: JSON.stringify({
                          current_password: current,
                          confirmation,
                          close_owned_stores: true,
                        }),
                      });
                      await signOut().catch(() => {});
                      router.replace("/auth");
                    }),
                  true,
                )
              }
            />
          </>
        )}
      </Card>
      <Label muted>Stoqo 0.3.1 · Your stock. In a good place.</Label>
    </Screen>
  );
}
