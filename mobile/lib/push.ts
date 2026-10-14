import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { api, post, sessionVersion } from "./api";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
let registrationQueue: Promise<unknown> = Promise.resolve();

export function registerPush({ requestPermission = true } = {}) {
  const version = sessionVersion();
  const run = registrationQueue.catch(() => {}).then(async () => {
    const current = () => version !== null && sessionVersion() === version;
    if (!current()) return null;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!Device.isDevice || !["android", "ios"].includes(Platform.OS) || !projectId) {
      if (!requestPermission) return null;
      throw new Error(!Device.isDevice
        ? "Try notifications on an actual phone."
        : "Background alerts are not available in this build yet.");
    }
    if (!requestPermission &&
      await SecureStore.getItemAsync("stoqo.push-enabled") === "false") return null;
    if (!current()) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("store-activity", {
        name: "Store activity",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (!current()) return null;
    if (!permission.granted && requestPermission)
      permission = await Notifications.requestPermissionsAsync();
    if (!current()) return null;
    if (!permission.granted &&
      permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
      if (!requestPermission) return null;
      throw new Error("Enable notifications in your phone settings to receive alerts.");
    }
    let installation = await SecureStore.getItemAsync("stoqo.installation");
    if (!installation) {
      installation = `device_${Crypto.randomUUID().replace(/-/g, "")}`;
      await SecureStore.setItemAsync("stoqo.installation", installation);
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    // Token acquisition can outlast a logout or account switch.
    if (!current()) return null;
    const result = await api<{ id: number }>("devices", post({
      device: {
        installation_id: installation,
        expo_push_token: token,
        platform: Platform.OS,
      },
    }));
    if (!current()) return null;
    await SecureStore.setItemAsync("stoqo.push-device", String(result.data.id));
    await SecureStore.setItemAsync("stoqo.push-enabled", "true");
    return result.data;
  });
  registrationQueue = run;
  return run;
}

export function unregisterPush() {
  const version = sessionVersion();
  const run = registrationQueue.catch(() => {}).then(async () => {
    if (version === null || sessionVersion() !== version) return;
    // Explicit disable also suppresses automatic registration after login.
    await SecureStore.setItemAsync("stoqo.push-enabled", "false");
    const id = await SecureStore.getItemAsync("stoqo.push-device");
    if (version !== sessionVersion()) return;
    if (id) await api(`devices/${id}`, { method: "DELETE" });
    if (version === sessionVersion())
      await SecureStore.deleteItemAsync("stoqo.push-device");
  });
  registrationQueue = run;
  return run;
}
