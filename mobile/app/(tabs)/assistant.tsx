import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { usePreferences } from "../../lib/preferences";
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
  confirm,
} from "../../components/ui";
import type { Proposal } from "../../lib/types";
type Message = {
  role: "user" | "assistant";
  text: string;
  actions?: Proposal[];
};
export default function Assistant() {
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
    if (!text.trim() || busy) return;
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
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.data.reply,
          actions: response.data.actions,
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
      setInput(text);
    } finally {
      setBusy(false);
    }
  }
  async function task(action: Proposal) {
    setActionBusy(action.id);
    setError("");
    try {
      const result = await api<{ message: string; sale_id?: number }>(
        `assistant/actions/${action.id}/confirm`,
        post({}),
        business?.id,
      );
      setConfirmed((current) => ({
        ...current,
        [action.id]: result.data.message,
      }));
      await cache.invalidateQueries({ queryKey: ["store", business?.id] });
      if (result.data.sale_id) router.push(`/sales/${result.data.sale_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }
  return (
    <Screen scroll={false}>
      <Heading
        title="Ask Stoqo"
        description="A little help. Right when you need it."
      />
      {!available && (
        <Card>
          <Label>
            {capabilities.data?.data.enabled
              ? "The assistant is not connected yet."
              : "Your store owner can enable the AI assistant in Settings."}
          </Label>
          <Label muted>
            Inventory, sales and team access remain available.
          </Label>
          <Button
            title="How Stoqo works"
            kind="soft"
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
      )}
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
        contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
      >
        {messages.map((m, index) => (
          <Card
            key={index}
            style={{
              backgroundColor: m.role === "user" ? colors.soft : colors.card,
            }}
          >
            <Label muted>{m.role === "user" ? "You" : "Stoqo"}</Label>
            <Label>{m.text}</Label>
            {m.role === "assistant" && (
              <Button
                title="Read aloud"
                kind="soft"
                onPress={() => {
                  void Speech.stop();
                  Speech.speak(m.text, {
                    language: language === "hi" ? "hi-IN" : "en-IN",
                  });
                }}
              />
            )}
            {m.actions?.map((action) => (
              <Card key={action.id} style={{ backgroundColor: colors.soft }}>
                <Label>{action.kind.replaceAll("_", " ")}</Label>
                {Object.entries(action.payload).map(([k, v]) => (
                  <Label
                    key={k}
                  >{`${k.replaceAll("_", " ")}: ${Array.isArray(v) ? v.map((i) => `${(i as Record<string, unknown>).product_name} × ${(i as Record<string, unknown>).quantity}`).join(", ") : String(v)}`}</Label>
                ))}
                {confirmed[action.id] ? (
                  <Label>{confirmed[action.id]}</Label>
                ) : (
                  <>
                    <Label
                      muted
                    >{`Review before confirming. Expires ${new Date(action.expires_at).toLocaleTimeString()}.`}</Label>
                    <Button
                      title="Confirm task"
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
        ))}
        {messages.length === 0 && available && (
          <Row>
            {[
              "What is running low?",
              "Show today’s sales",
              "How do I invite an employee?",
            ].map((q) => (
              <Pill key={q} label={q} onPress={() => void send(q)} />
            ))}
          </Row>
        )}
      </ScrollView>
      <ErrorBox message={error} />
      <Field
        label={listening ? "Listening…" : "Ask about your store"}
        value={input}
        onChangeText={setInput}
        maxLength={1200}
        multiline
        editable={!busy}
        style={{ maxHeight: 120 }}
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Button
            title="Send"
            busy={busy}
            disabled={!available || !input.trim() || listening}
            onPress={() => void send()}
          />
        </View>
        <Button
          title={listening ? "Stop listening" : "Voice input"}
          kind="soft"
          disabled={busy}
          onPress={() => void voice()}
        />
      </Row>
    </Screen>
  );
}
