import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, money, sessionVersion } from "../../lib/api";
import {
  readStoreShortcut,
  type StoreShortcut,
} from "../../lib/assistant-shortcuts";
import { useAuth } from "../../lib/auth";
import { usePreferences } from "../../lib/preferences";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Icon,
  IconButton,
  Loading,
  Motion,
  Label,
  Screen,
  confirm,
} from "../../components/ui";
import type { Proposal } from "../../lib/types";
type Message = {
  role: "user" | "assistant";
  text: string;
  actions?: Proposal[];
};
export default function Assistant() {
  const { user, business } = useAuth();
  return <StoreAssistant key={`${user?.id}.${business?.id}`} />;
}
function StoreAssistant() {
  const { business } = useAuth(),
    { language, colors } = usePreferences(),
    cache = useQueryClient();
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false),
    [listening, setListening] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState<Record<number, string>>({}),
    [actionBusy, setActionBusy] = useState<number | null>(null);
  const scroll = useRef<ScrollView>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const capabilities = useQuery({
    queryKey: ["store", business?.id, "assistant-capabilities"],
    queryFn: () =>
      api<{ configured: boolean; enabled: boolean; help: string }>(
        "assistant/capabilities",
        {},
        business?.id,
      ),
    enabled: !!business,
  });
  const available =
    !!capabilities.data?.data.configured && !!capabilities.data?.data.enabled;
  async function shortcut(kind: StoreShortcut) {
    if (busy || !business) return;
    const id = business.id,
      version = sessionVersion();
    const current = () => mounted.current && sessionVersion() === version;
    setBusy(true);
    setError("");
    try {
      const text = await readStoreShortcut(kind, id, language);
      if (current())
        setMessages((messages) => [...messages, { role: "assistant", text }]);
    } catch (e) {
      if (current()) setError((e as Error).message);
    } finally {
      if (current()) setBusy(false);
    }
  }
  useEffect(
    () => () => {
      ExpoSpeechRecognitionModule.abort();
      void Speech.stop();
    },
    [],
  );
  useSpeechRecognitionEvent("result", (event) => {
    if (event.results[0]) setInput(event.results[0].transcript.slice(0, 1200));
  });
  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setError(
      event.message ||
        "Voice input is unavailable. You can type your question.",
    );
  });
  async function voice() {
    try {
      if (listening) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Allow microphone and speech recognition in your phone settings.",
        );
      ExpoSpeechRecognitionModule.start({
        lang: language === "hi" ? "hi-IN" : "en-IN",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function send(text = input) {
    if (!available || !text.trim() || busy) return;
    const version = sessionVersion();
    const current = () => mounted.current && sessionVersion() === version;
    setBusy(true);
    setError("");
    setInput("");
    setMessages((current) => [...current, { role: "user", text: text.trim() }]);
    try {
      const response = await api<{ reply: string; actions: Proposal[] }>(
        "assistant/messages",
        post({ message: text.trim(), language }),
        business?.id,
      );
      if (!current()) return;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.data.reply,
          actions: response.data.actions,
        },
      ]);
    } catch (e) {
      if (!current()) return;
      setError((e as Error).message);
      setInput(text);
    } finally {
      if (current()) setBusy(false);
    }
  }
  async function task(action: Proposal) {
    const version = sessionVersion();
    const current = () => mounted.current && sessionVersion() === version;
    setActionBusy(action.id);
    setError("");
    try {
      const result = await api<{ message: string; sale_id?: number }>(
        `assistant/actions/${action.id}/confirm`,
        post({}),
        business?.id,
      );
      if (!current()) return;
      setConfirmed((current) => ({
        ...current,
        [action.id]: result.data.message,
      }));
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
      if (current() && result.data.sale_id)
        router.push(`/sales/${result.data.sale_id}`);
    } catch (e) {
      if (current()) setError((e as Error).message);
    } finally {
      if (current()) setActionBusy(null);
    }
  }
  return (
    <Screen scroll={false}>
      <Motion>
        <View style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
          <View
            style={{
              width: 49,
              height: 49,
              borderRadius: 17,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="sparkle" color={colors.onPrimary} size={25} />
          </View>
          <View style={{ flex: 1 }}>
            <Label size={24} weight="extra" style={{ letterSpacing: -0.8 }}>
              Ask Stoqo
            </Label>
            <Label muted size={12}>
              A little help. Right when you need it.
            </Label>
          </View>
        </View>
      </Motion>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: false })
        }
        contentContainerStyle={{ gap: 15, paddingBottom: 18, flexGrow: 1 }}
      >
        {capabilities.isLoading ? <Loading /> : null}
        {capabilities.isError ? (
          <Card>
            <ErrorBox message={(capabilities.error as Error).message} />
            <Button
              title="Try again"
              kind="soft"
              onPress={() => void capabilities.refetch()}
            />
          </Card>
        ) : null}
        {!available && capabilities.data ? (
          <Motion>
            <Card
              style={{
                backgroundColor: colors.hero,
                borderColor: colors.hero,
                padding: 20,
                gap: 13,
              }}
            >
              <Label
                color={colors.heroInk}
                weight="extra"
                size={22}
                style={{ letterSpacing: -0.8 }}
              >
                Your store, a little easier.
              </Label>
              <Label color={colors.heroInk} size={12} style={{ opacity: 0.85 }}>
                {capabilities.data.data.configured
                  ? "AI chat can be enabled by your store owner in Settings. Store shortcuts are ready below."
                  : "AI chat is not connected yet. Store shortcuts work with your live inventory."}
              </Label>
              <Button
                title="How Stoqo works"
                kind="accent"
                compact
                trailingIcon="arrow"
                onPress={() =>
                  setMessages((current) => [
                    ...current,
                    {
                      role: "assistant",
                      text:
                        capabilities.data?.data.help ??
                        "Scan a product, add it to your cart, then confirm the bill to update stock.",
                    },
                  ])
                }
              />
            </Card>
          </Motion>
        ) : null}
        <Card>
          <Label weight="extra" size={17}>
            Store shortcuts
          </Label>
          <Label muted size={12}>
            Check stock or jump straight to a task.
          </Label>
          <View style={{ gap: 9 }}>
            <View style={{ flexDirection: "row", gap: 9 }}>
              <Button
                title="Store snapshot"
                icon="chart"
                compact
                kind="soft"
                disabled={busy}
                style={{ flex: 1 }}
                onPress={() => void shortcut("summary")}
              />
              <Button
                title="Low stock"
                icon="warning"
                compact
                kind="soft"
                disabled={busy}
                style={{ flex: 1 }}
                onPress={() => void shortcut("low")}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 9 }}>
              <Button
                title="Out of stock"
                icon="box"
                compact
                kind="soft"
                disabled={busy}
                style={{ flex: 1 }}
                onPress={() => void shortcut("out")}
              />
              <Button
                title="New bill"
                icon="bag"
                compact
                kind="soft"
                style={{ flex: 1 }}
                onPress={() => router.push("/(tabs)/sell")}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 9 }}>
              <Button
                title="Scan product"
                icon="scan"
                compact
                kind="soft"
                style={{ flex: 1 }}
                onPress={() => router.push("/scan?mode=inventory")}
              />
              <Button
                title="Update stock"
                icon="plus"
                compact
                kind="soft"
                style={{ flex: 1 }}
                onPress={() => router.push("/(tabs)/inventory")}
              />
            </View>
          </View>
        </Card>
        {messages.length === 0 && available ? (
          <Motion style={{ gap: 20, paddingTop: 27 }}>
            <View style={{ gap: 6 }}>
              <Label size={30} weight="extra" style={{ letterSpacing: -1 }}>
                What&apos;s on your mind?
              </Label>
              <Label muted>Ask about stock, sales or your next step.</Label>
            </View>
            <View style={{ gap: 9 }}>
              {[
                { text: "What is running low?", icon: "box" as const },
                { text: "Show today’s sales", icon: "chart" as const },
                { text: "How do I invite an employee?", icon: "team" as const },
              ].map((q) => (
                <Card
                  key={q.text}
                  onPress={() => void send(q.text)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    gap: 11,
                  }}
                >
                  <Icon name={q.icon} color={colors.primary} size={21} />
                  <Label size={12} weight="bold" style={{ flex: 1 }}>
                    {q.text}
                  </Label>
                  <Icon name="arrow" color={colors.muted} size={17} />
                </Card>
              ))}
            </View>
          </Motion>
        ) : null}
        {messages.map((m, index) => (
          <Motion key={index}>
            <Card
              style={{
                backgroundColor:
                  m.role === "user" ? colors.primary : colors.card,
                marginLeft: m.role === "user" ? 28 : 0,
                marginRight: m.role === "assistant" ? 10 : 0,
                borderColor: m.role === "user" ? colors.primary : colors.line,
                borderBottomRightRadius: m.role === "user" ? 7 : 24,
                borderBottomLeftRadius: m.role === "assistant" ? 7 : 24,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
              >
                <Icon
                  name={m.role === "user" ? "user" : "sparkle"}
                  size={15}
                  color={m.role === "user" ? colors.onPrimary : colors.primary}
                />
                <Label
                  size={11}
                  weight="bold"
                  color={m.role === "user" ? colors.onPrimary : colors.muted}
                >
                  {m.role === "user" ? "You" : "Stoqo"}
                </Label>
              </View>
              <Label color={m.role === "user" ? colors.onPrimary : colors.ink}>
                {m.text}
              </Label>
              {m.role === "assistant" ? (
                <Button
                  title="Read aloud"
                  compact
                  icon="volume"
                  kind="soft"
                  onPress={() => {
                    void Speech.stop();
                    Speech.speak(m.text, {
                      language: language === "hi" ? "hi-IN" : "en-IN",
                    });
                  }}
                />
              ) : null}
              {m.actions?.map((action) => (
                <Card
                  key={action.id}
                  style={{
                    backgroundColor: colors.soft,
                    padding: 14,
                    borderRadius: 17,
                  }}
                >
                  <Label weight="extra">
                    {action.kind === "stock_change"
                      ? "Change stock"
                      : action.kind === "create_sale"
                        ? "Create bill"
                        : "Invite teammate"}
                  </Label>
                  {action.kind === "stock_change" ? (
                    <>
                      <Label>{String(action.payload.product_name)}</Label>
                      <Label>{`${String(action.payload.quantity)} · ${String(action.payload.movement_type).replaceAll("_", " ")}`}</Label>
                      <Label
                        muted
                      >{`Stock now: ${action.payload.current_stock}`}</Label>
                    </>
                  ) : null}
                  {action.kind === "invite_employee" ? (
                    <>
                      <Label>{String(action.payload.email)}</Label>
                      <Label>{`Access: ${action.payload.role}`}</Label>
                    </>
                  ) : null}
                  {action.kind === "create_sale" ? (
                    <>
                      {(action.payload.items as Record<string, unknown>[]).map(
                        (item, i) => (
                          <Label
                            key={i}
                          >{`${item.product_name} × ${item.quantity} · ${money(String(item.unit_price), String(action.payload.currency))} each`}</Label>
                        ),
                      )}
                      <Label>{`${money(String(action.payload.total), String(action.payload.currency))} · ${String(action.payload.payment_method).toUpperCase()}`}</Label>
                    </>
                  ) : null}
                  {confirmed[action.id] ? (
                    <Label>{confirmed[action.id]}</Label>
                  ) : (
                    <>
                      <Label
                        muted
                        size={12}
                      >{`Review before confirming. Expires ${new Date(action.expires_at).toLocaleTimeString()}.`}</Label>
                      <Button
                        title="Confirm task"
                        icon="check"
                        busy={actionBusy === action.id}
                        disabled={
                          actionBusy !== null ||
                          new Date(action.expires_at).getTime() < Date.now()
                        }
                        onPress={() =>
                          confirm(
                            "Confirm this task?",
                            "Stoqo will apply exactly the changes shown above using your current permissions.",
                            () => void task(action),
                          )
                        }
                      />
                      <Button
                        title="Cancel task"
                        kind="soft"
                        disabled={actionBusy !== null}
                        onPress={() =>
                          void api(
                            `assistant/actions/${action.id}`,
                            { method: "DELETE" },
                            business?.id,
                          )
                            .then(() =>
                              setConfirmed((current) => ({
                                ...current,
                                [action.id]: "Cancelled",
                              })),
                            )
                            .catch((e) => setError(e.message))
                        }
                      />
                    </>
                  )}
                </Card>
              ))}
            </Card>
          </Motion>
        ))}
        {busy ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              padding: 8,
            }}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Label muted size={12}>
              {available ? "Stoqo is thinking…" : "Checking your store…"}
            </Label>
          </View>
        ) : null}
      </ScrollView>
      <ErrorBox message={error} />
      {available ? (
        <View style={{ gap: 11, paddingBottom: 13 }}>
          <Field
            label={listening ? "Listening…" : "Ask about your store"}
            placeholder="Type a question…"
            value={input}
            onChangeText={setInput}
            maxLength={1200}
            multiline
            editable={!busy}
            style={{ maxHeight: 110 }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton
              name={listening ? "close" : "mic"}
              label={listening ? "Stop listening" : "Voice input"}
              disabled={busy}
              onPress={() => void voice()}
            />
            <Button
              title={listening ? "Listening…" : "Send message"}
              trailingIcon="arrow"
              busy={busy}
              disabled={!input.trim() || listening}
              onPress={() => void send()}
              style={{ flex: 1 }}
            />
          </View>
          <Label muted size={10}>
            Your questions and permitted store data are sent to Google Gemini
            under its API data terms.
          </Label>
        </View>
      ) : null}
    </Screen>
  );
}
