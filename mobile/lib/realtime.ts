import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api, apiOrigin, post } from "./api";
import { useAuth } from "./auth";
import { createRealtimeConnection } from "./realtime-connection";

export function useRealtime() {
  const { business, user, refresh } = useAuth(),
    cache = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!user || !business) return;
    const current = business.id;
    const refreshAccess = () => {
      void refresh().catch(() => {});
    };
    const connection = createRealtimeConnection({
      businessId: current,
      getTicket: async () =>
        (await api<{ ticket: string }>("realtime/tickets", post({}))).data
          .ticket,
      socketUrl: (ticket) =>
        `${apiOrigin().replace(/^http/, "ws")}/cable?ticket=${encodeURIComponent(ticket)}`,
      createSocket: (url) => new WebSocket(url),
      onConnected(value) {
        setConnected(value);
        if (value) void cache.invalidateQueries();
      },
      onAccessChanged() {
        cache.clear();
        refreshAccess();
      },
      onEvent(event) {
        if (event.type === "membership_changed") {
          cache.clear();
          refreshAccess();
        } else if (event.business_id === current) {
          void cache.invalidateQueries({ queryKey: ["store", current] });
        }
      },
    });
    const subscription = AppState.addEventListener("change", (state) => {
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
  }, [user?.id, business?.id, business?.role, cache, refresh]);
  return connected;
}
