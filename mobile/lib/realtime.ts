import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api, apiOrigin, post, sessionVersion } from "./api";
import { useAuth } from "./auth";
import { createRealtimeConnection } from "./realtime-connection";

export function useRealtime() {
  const { business, user, refresh } = useAuth(),
    cache = useQueryClient();
  const [connected, setConnected] = useState(false);
  const version = sessionVersion();
  useEffect(() => {
    if (!user || !business || version === null) return;
    const current = business.id;
    const refreshAccess = () => {
      if (sessionVersion() !== version) return;
      void refresh().catch(() => {});
    };
    const connection = createRealtimeConnection({
      businessId: current,
      getTicket: async () => {
        const { data } = await api<{ ticket: string }>("realtime/tickets", post({}));
        if (sessionVersion() !== version) throw new Error("Login changed during connection.");
        return data.ticket;
      },
      socketUrl: (ticket) =>
        `${apiOrigin().replace(/^http/, "ws")}/cable?ticket=${encodeURIComponent(ticket)}`,
      createSocket: (url) => new WebSocket(url),
      onConnected(value) {
        if (value && sessionVersion() !== version) return;
        setConnected(value);
        if (value) void cache.invalidateQueries();
      },
      onAccessChanged() {
        if (sessionVersion() !== version) return;
        cache.clear();
        refreshAccess();
      },
      onEvent(event) {
        if (sessionVersion() !== version) return;
        if (event.type === "membership_changed") {
          cache.clear();
          refreshAccess();
        } else if (event.business_id === current) {
          void cache.invalidateQueries({ queryKey: ["store", current] });
        }
      },
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (sessionVersion() !== version) {
        connection.suspend();
        return;
      }
      if (state === "active") {
        void cache.invalidateQueries();
        refreshAccess();
        connection.resume();
      } else connection.suspend();
    });
    if (AppState.currentState === "active") connection.resume();
    return () => {
      connection.stop();
      subscription.remove();
    };
  }, [user?.id, business?.id, business?.role, version, cache, refresh]);
  return connected;
}
