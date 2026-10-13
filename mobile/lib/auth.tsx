import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  post,
  restoreSession,
  saveSession,
  setExpiredHandler,
  ApiError,
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
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [businesses, setBusinesses] = useState<Business[]>([]),
    [business, setBusiness] = useState<Business | null>(null);
  async function clear() {
    await saveSession(null);
    cache.clear();
    setUser(null);
    setBusinesses([]);
    setBusiness(null);
    await SecureStore.deleteItemAsync("stoqo.selected-store");
  }
  async function refresh() {
    const me = await api<User>("auth/me");
    setUser(me.data);
    const stores = (await api<Business[]>("businesses")).data;
    // Membership refreshes must not retain data fetched with an earlier role.
    cache.clear();
    setBusinesses(stores);
    const saved = await SecureStore.getItemAsync("stoqo.selected-store");
    setBusiness(
      stores.find((b) => String(b.id) === saved) ?? stores[0] ?? null,
    );
    setError("");
  }
  useEffect(() => {
    setExpiredHandler(() => {
      void clear();
    });
    void (async () => {
      try {
        if (await restoreSession()) await refresh();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await clear();
        else setError((e as Error).message);
      } finally {
        setReady(true);
      }
    })();
  }, []);
  async function loginResult(result: { user: User; token: string }) {
    cache.clear();
    await saveSession(result.token);
    setUser(result.user);
    await refresh();
  }
  async function selectBusiness(id: number) {
    if (!businesses.some((b) => b.id === id))
      throw new Error("Store access is no longer available");
    await SecureStore.setItemAsync("stoqo.selected-store", String(id));
    cache.clear();
    setBusiness(businesses.find((b) => b.id === id) ?? null);
  }
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
