import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  post,
  restoreSession,
  saveSession,
  setExpiredHandler,
  ApiError,
  sessionVersion,
} from "./api";
import type { Business, User } from "./types";
type Auth = {
  ready: boolean;
  error: string;
  user: User | null;
  businesses: Business[];
  business: Business | null;
  refresh: () => Promise<void>;
  selectBusiness: (id: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  newStore: (name: string, type: string) => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cache = useQueryClient();
  const refreshRequest = useRef(0);
  const selectionRequest = useRef(0);
  const selectionWrite = useRef(Promise.resolve());
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [businesses, setBusinesses] = useState<Business[]>([]),
    [business, setBusiness] = useState<Business | null>(null);
  const clear = useCallback(async () => {
    refreshRequest.current++;
    selectionRequest.current++;
    cache.clear();
    setUser(null);
    setBusinesses([]);
    setBusiness(null);
    setError("");
    await saveSession(null);
    await SecureStore.deleteItemAsync("stoqo.selected-store");
  }, [cache]);
  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    const version = sessionVersion();
    const current = () =>
      version !== null && sessionVersion() === version &&
      refreshRequest.current === request;
    if (!current()) return;
    try {
      const me = await api<User>("auth/me");
      if (!current()) return;
      const stores = (await api<Business[]>("businesses")).data;
      if (!current()) return;
      const saved = await SecureStore.getItemAsync("stoqo.selected-store");
      if (!current()) return;
      // Apply the user and memberships together, only for the current login.
      cache.clear();
      setUser(me.data);
      setBusinesses(stores);
      setBusiness(
        stores.find((b) => String(b.id) === saved) ?? stores[0] ?? null,
      );
      setError("");
    } catch (e) {
      if (current()) setError((e as Error).message);
      throw e;
    }
  }, [cache]);
  useEffect(() => {
    setExpiredHandler(() => {
      void clear().catch(() => {});
    });
    void (async () => {
      try {
        if (await restoreSession()) await refresh();
      } catch (e) {
        // refresh handles failures for its own login. A late startup failure
        // must never clear a newer session.
        if (!(e instanceof ApiError && e.status === 401) && sessionVersion() === null)
          setError((e as Error).message);
      } finally {
        setReady(true);
      }
    })();
  }, [clear, refresh]);
  async function loginResult(result: { user: User; token: string }) {
    cache.clear();
    await saveSession(result.token);
    await refresh();
  }
  const selectBusiness = useCallback(
    async (id: number) => {
      const version = sessionVersion();
      const request = ++selectionRequest.current;
      if (!businesses.some((b) => b.id === id))
        throw new Error("Store access is no longer available");
      const current = () => version !== null && sessionVersion() === version &&
        selectionRequest.current === request;
      const write = selectionWrite.current.catch(() => {}).then(async () => {
        if (!current()) throw new Error("Store selection changed. Please retry.");
        await SecureStore.setItemAsync("stoqo.selected-store", String(id));
        if (!current()) throw new Error("Store selection changed. Please retry.");
        cache.clear();
        setBusiness(businesses.find((b) => b.id === id) ?? null);
      });
      selectionWrite.current = write;
      await write;
    },
    [businesses, cache],
  );
  async function acceptInvitation(token: string) {
    const result = await api<{ business_id: number }>(
      "team_invitations/accept",
      post({ token }),
    );
    await SecureStore.setItemAsync(
      "stoqo.selected-store",
      String(result.data.business_id),
    );
    await SecureStore.deleteItemAsync("stoqo.pending-invitation");
    await refresh();
  }
  return (
    <Context.Provider
      value={{
        ready,
        error,
        user,
        businesses,
        business,
        refresh,
        selectBusiness,
        acceptInvitation,
        async signIn(email, password) {
          await loginResult(
            (
              await api<{ user: User; token: string }>(
                "auth/login",
                post({ email: email.trim(), password }),
              )
            ).data,
          );
        },
        async signUp(name, email, password) {
          await loginResult(
            (
              await api<{ user: User; token: string }>(
                "auth/signup",
                post({
                  user: {
                    name,
                    email: email.trim(),
                    password,
                    password_confirmation: password,
                  },
                }),
              )
            ).data,
          );
        },
        async signOut() {
          try {
            await api("auth/logout", { method: "DELETE" });
          } finally {
            await clear();
          }
        },
        async newStore(name, type) {
          const result = await api<Business>(
            "businesses",
            post({
              business: {
                name,
                business_type: type,
                currency: "INR",
                timezone: "Asia/Kolkata",
                country: "IN",
              },
            }),
          );
          await SecureStore.setItemAsync(
            "stoqo.selected-store",
            String(result.data.id),
          );
          await refresh();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Authentication provider missing");
  return value;
}
