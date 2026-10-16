import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revision: 1 as number | null,
  storage: new Map<string, string>(),
  api: vi.fn(),
  getPermission: vi.fn(),
  requestPermission: vi.fn(),
  token: vi.fn(),
  constants: {
    expoConfig: {
      extra: {
        androidPushConfigured: true,
        eas: { projectId: "6b57ac93-a2d0-4d22-8839-7701a342ca77" },
      },
    },
  },
}));
vi.mock("./api", () => ({
  api: mocks.api,
  post: (body: unknown) => ({ method: "POST", body: JSON.stringify(body) }),
  sessionVersion: () => mocks.revision,
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-constants", () => ({ default: mocks.constants }));
vi.mock("expo-device", () => ({ isDevice: true }));
vi.mock("expo-crypto", () => ({
  randomUUID: () => "7cd35122-353f-4180-ac3e-efec622d2f32",
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => mocks.storage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mocks.storage.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mocks.storage.delete(key);
  },
}));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  getPermissionsAsync: mocks.getPermission,
  requestPermissionsAsync: mocks.requestPermission,
  getExpoPushTokenAsync: mocks.token,
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.revision = 1;
  mocks.constants.expoConfig.extra.androidPushConfigured = true;
  mocks.storage.clear();
  mocks.constants.expoConfig.extra.eas.projectId =
    "6b57ac93-a2d0-4d22-8839-7701a342ca77";
  mocks.api.mockResolvedValue({ data: { id: 7 } });
  mocks.getPermission.mockResolvedValue({ granted: true });
  mocks.requestPermission.mockResolvedValue({ granted: true });
  mocks.token.mockResolvedValue({ data: "ExpoPushToken[first_device_token]" });
});

describe("Push across logins on the same phone", () => {
  it("skips permission and token requests in Android builds without Firebase configuration", async () => {
    mocks.constants.expoConfig.extra.androidPushConfigured = false;
    const { registerPush, pushAvailability } = await import("./push");
    expect(pushAvailability().available).toBe(false);
    expect(await registerPush({ requestPermission: false })).toBeNull();
    await expect(registerPush()).rejects.toThrow(
      "not available in this app version",
    );
    expect(mocks.getPermission).not.toHaveBeenCalled();
    expect(mocks.token).not.toHaveBeenCalled();
    expect(mocks.api).not.toHaveBeenCalled();
  });

  it("turns a native missing-Firebase error into a useful message", async () => {
    mocks.token.mockRejectedValue(
      new Error("Default FirebaseApp is not initialized googleServicesFile"),
    );
    const { registerPush } = await import("./push");
    const error = await registerPush().catch((error: Error) => error);
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain("view your store notifications");
      expect(error.message).not.toContain("FirebaseApp");
    }
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("reattaches the installation to the new login and updates a rotated token", async () => {
    const { registerPush } = await import("./push");
    await registerPush({ requestPermission: false });
    const installation = mocks.storage.get("stoqo.installation");
    mocks.revision = 2;
    mocks.token.mockResolvedValue({
      data: "ExpoPushToken[rotated_device_token]",
    });
    await registerPush({ requestPermission: false });
    const second = JSON.parse(mocks.api.mock.calls[1][1].body);
    expect(second.device.installation_id).toBe(installation);
    expect(second.device.expo_push_token).toBe(
      "ExpoPushToken[rotated_device_token]",
    );
    expect(mocks.requestPermission).not.toHaveBeenCalled();
  });

  it("preserves an explicit disable after a new login until manually enabled", async () => {
    const { registerPush, unregisterPush } = await import("./push");
    await registerPush();
    await unregisterPush();
    mocks.api.mockClear();
    mocks.revision = 2;
    expect(await registerPush({ requestPermission: false })).toBeNull();
    expect(mocks.api).not.toHaveBeenCalled();
    await registerPush();
    expect(mocks.storage.get("stoqo.push-enabled")).toBe("true");
    expect(mocks.api).toHaveBeenCalledOnce();
  });

  it("does not attach an old account's registration after a logout during token acquisition", async () => {
    const { registerPush } = await import("./push");
    mocks.token.mockImplementationOnce(async () => {
      mocks.revision = 2;
      return { data: "ExpoPushToken[old_account_token]" };
    });
    expect(await registerPush()).toBeNull();
    expect(mocks.api).not.toHaveBeenCalled();
    expect(mocks.storage.has("stoqo.push-device")).toBe(false);
  });

  it("leaves notification permission prompts to the explicit enable action", async () => {
    const { registerPush } = await import("./push");
    mocks.getPermission.mockResolvedValue({ granted: false });
    expect(await registerPush({ requestPermission: false })).toBeNull();
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    await registerPush();
    expect(mocks.requestPermission).toHaveBeenCalledOnce();
    expect(mocks.api).toHaveBeenCalledOnce();
  });

  it("does not interrupt login when the build has no push project", async () => {
    const { registerPush } = await import("./push");
    mocks.constants.expoConfig.extra.eas.projectId = "";
    expect(await registerPush({ requestPermission: false })).toBeNull();
    expect(mocks.getPermission).not.toHaveBeenCalled();
    await expect(registerPush()).rejects.toThrow(
      "not available in this app version",
    );
  });

  it("recovers registration after a temporary provider failure", async () => {
    const { registerPush } = await import("./push");
    mocks.token.mockRejectedValueOnce(new Error("Offline"));
    await expect(registerPush()).rejects.toThrow(
      "Could not enable background alerts",
    );
    expect(await registerPush({ requestPermission: false })).toEqual({ id: 7 });
    expect(mocks.api).toHaveBeenCalledOnce();
  });

  it("serializes enable then disable so late registration cannot silently re-enable alerts", async () => {
    const { registerPush, unregisterPush } = await import("./push");
    const enabling = registerPush();
    const disabling = unregisterPush();
    const automatic = registerPush({ requestPermission: false });
    await Promise.all([enabling, disabling, automatic]);
    expect(mocks.storage.get("stoqo.push-enabled")).toBe("false");
    expect(mocks.storage.has("stoqo.push-device")).toBe(false);
    expect(mocks.api.mock.calls.map(([path]) => path)).toEqual([
      "devices",
      "devices/7",
    ]);
  });
});
