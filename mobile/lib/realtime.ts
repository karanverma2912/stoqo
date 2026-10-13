import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api, apiOrigin, post } from "./api";
import { useAuth } from "./auth";
export function useRealtime() {
  const { business, user, refresh } = useAuth(),
    cache = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!user || !business) return;
    let stopped = false,
      socket: WebSocket | undefined,
      timer: ReturnType<typeof setTimeout> | undefined,
      attempt = 0;
    const current = business.id;
    async function connect() {
      if (stopped || AppState.currentState !== "active") return;
      try {
        const { data } = await api<{ ticket: string }>(
          "realtime/tickets",
          post({}),
        );
        if (stopped) return;
        const origin = apiOrigin().replace(/^http/, "ws");
        socket = new WebSocket(
          `${origin}/cable?ticket=${encodeURIComponent(data.ticket)}`,
        );
        socket.onopen = () => {
          if (stopped) {
            socket?.close();
            return;
          }
          attempt = 0;
          socket?.send(
            JSON.stringify({
              command: "subscribe",
              identifier: JSON.stringify({
                channel: "WorkspaceChannel",
                business_id: current,
              }),
            }),
          );
          socket?.send(
            JSON.stringify({
              command: "subscribe",
              identifier: JSON.stringify({ channel: "UserChannel" }),
            }),
          );
        };
        socket.onmessage = (e) => {
          try {
            const frame = JSON.parse(e.data);
            if (frame.type === "confirm_subscription") {
              setConnected(true);
              void cache.invalidateQueries();
            }
            const event = frame.message;
            if (event?.type === "membership_changed") {
              void refresh();
              void cache.invalidateQueries();
            } else if (event?.business_id === current) {
              void cache.invalidateQueries({ queryKey: ["store", current] });
            }
          } catch {}
        };
        socket.onclose = () => {
          setConnected(false);
          retry();
        };
        socket.onerror = () => socket?.close();
      } catch {
        setConnected(false);
        retry();
      }
    }
    function retry() {
      if (!stopped && AppState.currentState === "active") {
        clearTimeout(timer);
        timer = setTimeout(
          () => void connect(),
          Math.min(30000, 1000 * 2 ** attempt++),
        );
      }
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void cache.invalidateQueries();
        void refresh().catch(() => {});
        void connect();
      } else {
        clearTimeout(timer);
        socket?.close();
      }
    });
    void connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
      subscription.remove();
      setConnected(false);
    };
  }, [user?.id, business?.id]);
  return connected;
}
