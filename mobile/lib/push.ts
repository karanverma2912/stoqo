import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { api, post } from "./api";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function registerPush() {
  if (!Device.isDevice)
    throw new Error("Try notifications on an actual phone.");
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId)
    throw new Error("Background alerts are not available in this build yet.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("store-activity", {
      name: "Store activity",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Enable notifications in your phone settings to receive alerts.",
    );
  let installation = await SecureStore.getItemAsync("stoqo.installation");
  if (!installation) {
    installation = `device_${Crypto.randomUUID().replace(/-/g, "")}`;
    await SecureStore.setItemAsync("stoqo.installation", installation);
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const result = await api<{ id: number }>(
    "devices",
    post({
      device: {
        installation_id: installation,
        expo_push_token: token,
        platform: Platform.OS,
      },
    }),
  );
  await SecureStore.setItemAsync("stoqo.push-device", String(result.data.id));
  return result.data;
}
export async function unregisterPush() {
  const id = await SecureStore.getItemAsync("stoqo.push-device");
  if (id) await api(`devices/${id}`, { method: "DELETE" });
  await SecureStore.deleteItemAsync("stoqo.push-device");
}
