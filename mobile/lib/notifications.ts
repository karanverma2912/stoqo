import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { sessionVersion } from "./api";
import { registerPush } from "./push";
import { notificationTarget, type NotificationTarget } from "./notification-target";

export function useNotifications(navigationReady: boolean) {
  const { ready, user, businesses, selectBusiness } = useAuth();
  const cache = useQueryClient();
  const authVersion = sessionVersion();
  const handled = useRef(new Set<string>());
  const [pending, setPending] = useState<(NotificationTarget & { requestId: string }) | null>(null);

  useEffect(() => {
    function receive(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const target = notificationTarget(response.notification.request.content.data);
      const requestId = response.notification.request.identifier;
      if (target && !handled.current.has(requestId)) setPending({ ...target, requestId });
    }
    const tapped = Notifications.addNotificationResponseReceivedListener(receive);
    const initial = Notifications.getLastNotificationResponse();
    if (initial) receive(initial);
    return () => tapped.remove();
  }, []);

  useEffect(() => {
    if (!ready || !navigationReady || !user || !pending) return;
    let cancelled = false;
    const version = sessionVersion();
    if (!businesses.some((store) => store.id === pending.businessId)) {
      handled.current.add(pending.requestId);
      setPending(null);
      Notifications.clearLastNotificationResponse();
      return;
    }
    void selectBusiness(pending.businessId).then(() => {
      if (cancelled || version !== sessionVersion()) return;
      handled.current.add(pending.requestId);
      Notifications.clearLastNotificationResponse();
      setPending(null);
      router.push("/notifications");
    }).catch(() => {
      if (!cancelled) setPending(null);
    });
    return () => { cancelled = true; };
  }, [ready, navigationReady, user?.id, authVersion, pending, businesses, selectBusiness]);

  useEffect(() => {
    if (!ready || !user) return;
    const sync = () => void registerPush({ requestPermission: false }).catch(() => {});
    const active = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    const token = Notifications.addPushTokenListener(sync);
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const target = notificationTarget(notification.request.content.data);
      if (target) void cache.invalidateQueries({ queryKey: ["store", target.businessId] });
    });
    sync();
    return () => { active.remove(); token.remove(); received.remove(); };
  }, [ready, user?.id, authVersion, cache]);
}
