import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { api, ApiError, post } from "./api";
import { useAuth } from "./auth";
import type { Envelope } from "./types";
type Saved = { version: 1; path: string; body: Record<string, any> };
// A pending request is frozen and belongs to one account, store and operation.
export function useDurableWrite(operation: string) {
  const { user, business } = useAuth();
  const key =
    user && business
      ? `stoqo.write.${user.id}.${business.id}.${operation}`
      : null;
  const [pending, setPending] = useState<Saved | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const current = useRef<Saved | null>(null),
    live = useRef(true),
    running = useRef(false);
  useEffect(() => {
    live.current = true;
    setReady(false);
    setError("");
    current.current = null;
    setPending(null);
    if (key)
      void AsyncStorage.getItem(key)
        .then((raw) => {
          if (!live.current) return;
          if (raw) {
            const record = JSON.parse(raw) as Saved;
            if (record.version !== 1 || !record.path || !record.body)
              throw new Error("Saved request needs support assistance.");
            current.current = record;
            setPending(record);
          }
          setReady(true);
        })
        .catch(() => {
          if (live.current)
            setError(
              "The saved request could not be restored. Please contact support before repeating this action.",
            );
        });
    return () => {
      live.current = false;
    };
  }, [key]);
  async function execute<T>(
    path: string,
    body: Record<string, any>,
    requestKeyRoot?: string,
    build?: (body: Record<string, any>) => RequestInit,
  ): Promise<Envelope<T>> {
    if (!key || !business || !ready)
      throw new Error("Wait for saved requests to load.");
    if (running.current)
      throw new Error("This request is already in progress.");
    running.current = true;
    try {
      let record = current.current;
      if (!record) {
        const idempotency_key = Crypto.randomUUID();
        const frozen = JSON.parse(JSON.stringify(body));
        if (requestKeyRoot)
          frozen[requestKeyRoot].idempotency_key = idempotency_key;
        else frozen.idempotency_key = idempotency_key;
        record = { version: 1, path, body: frozen };
        await AsyncStorage.setItem(key, JSON.stringify(record));
        current.current = record;
        if (live.current) setPending(record);
      }
      const result = await api<T>(
        record.path,
        build ? build(record.body) : post(record.body),
        business.id,
      );
      await AsyncStorage.removeItem(key);
      current.current = null;
      if (!live.current)
        throw new Error("The store changed while this request completed.");
      setPending(null);
      return result;
    } catch (error) {
      if (error instanceof ApiError && [400, 404, 422].includes(error.status)) {
        await AsyncStorage.removeItem(key);
        current.current = null;
        if (live.current) setPending(null);
      }
      throw error;
    } finally {
      running.current = false;
    }
  }
  return { pending, ready, error, execute };
}
