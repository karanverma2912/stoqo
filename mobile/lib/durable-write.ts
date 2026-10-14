import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { api, ApiError, post } from "./api";
import { useAuth } from "./auth";
import type { Envelope } from "./types";
import { DurableWriteSession, type SavedWrite } from "./durable-write-session";

// A pending request is frozen and belongs to one account, store and operation.
export function useDurableWrite(operation: string) {
  const { user, business } = useAuth();
  const key =
    user && business
      ? `stoqo.write.${user.id}.${business.id}.${operation}`
      : null;
  const current = useRef<DurableWriteSession | null>(null);
  const [state, setState] = useState<{
    key: string | null;
    pending: SavedWrite | null;
    ready: boolean;
    error: string;
  }>({ key: null, pending: null, ready: false, error: "" });

  useEffect(() => {
    if (!key) {
      current.current = null;
      setState({ key: null, pending: null, ready: false, error: "" });
      return;
    }
    const session = new DurableWriteSession(key, AsyncStorage, (value) => {
      if (current.current !== value) return;
      setState({
        key,
        pending: value.pending,
        ready: value.ready,
        error: value.error,
      });
    });
    current.current = session;
    setState({ key, pending: null, ready: false, error: "" });
    void session.restore();
    return () => session.deactivate();
  }, [key]);

  async function execute<T>(
    path: string,
    body: Record<string, any>,
    requestKeyRoot?: string,
    build?: (body: Record<string, any>) => RequestInit,
  ): Promise<Envelope<T>> {
    const session = current.current;
    if (!key || !business || session?.key !== key)
      throw new Error("Wait for saved requests to load.");
    return session.execute(
      () => {
        const idempotency_key = Crypto.randomUUID();
        const frozen = JSON.parse(JSON.stringify(body));
        if (requestKeyRoot)
          frozen[requestKeyRoot].idempotency_key = idempotency_key;
        else frozen.idempotency_key = idempotency_key;
        return { version: 1, path, body: frozen };
      },
      (record) =>
        api<T>(
          record.path,
          build ? build(record.body) : post(record.body),
          business.id,
        ),
      (error) =>
        error instanceof ApiError && [400, 404, 422].includes(error.status),
    );
  }

  const visible = state.key === key && current.current?.active;
  return {
    pending: visible ? state.pending : null,
    ready: visible ? state.ready : false,
    error: visible ? state.error : "",
    execute,
  };
}
