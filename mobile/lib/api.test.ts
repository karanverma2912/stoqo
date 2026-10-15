import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), remove: vi.fn(),
  constants: { expoConfig: { extra: { apiUrl: "https://stoqo-api.onrender.com", webUrl: "https://stoqo-web.onrender.com" } } },
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: mocks.get, setItemAsync: mocks.set, deleteItemAsync: mocks.remove,
}));
vi.mock("expo-constants", () => ({ default: mocks.constants }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(null);
  mocks.set.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("Native login isolation and recovery", () => {
  it("preserves password validation details from a rejected signup", async () => {
    const { api, ApiError, post } = await import("./api");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "validation_error", message: "Please check the highlighted details", details: { password: ["is too short (minimum is 12 characters)"] } } }), { status: 422 })));
    const failure = await api("auth/signup", post({ user: { password: "short" } })).catch((error) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.details).toEqual({ password: ["is too short (minimum is 12 characters)"] });
  });
  it("reads the bundled server origins without requiring a GitHub environment", async () => {
    const { apiOrigin, webOrigin } = await import("./api");
    expect(apiOrigin()).toBe("https://stoqo-api.onrender.com");
    expect(webOrigin()).toBe("https://stoqo-web.onrender.com");
  });

  it("does not expire a new login when an earlier request returns 401", async () => {
    const { api, saveSession, setExpiredHandler } = await import("./api");
    const response = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => response.promise));
    const expired = vi.fn();
    setExpiredHandler(expired);
    await saveSession("first-login");
    const request = api("auth/me").catch((error: Error) => error);
    await saveSession("new-login");
    response.resolve(new Response(JSON.stringify({ error: { message: "Expired" } }), { status: 401 }));
    expect(await request).toBeInstanceOf(Error);
    expect(expired).not.toHaveBeenCalled();
  });

  it("expires only authenticated requests belonging to the current login", async () => {
    const { api, saveSession, setExpiredHandler } = await import("./api");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const expired = vi.fn();
    setExpiredHandler(expired);
    await expect(api("auth/forgot_password")).rejects.toBeInstanceOf(Error);
    expect(expired).not.toHaveBeenCalled();
    await saveSession("current-login");
    await expect(api("auth/me")).rejects.toBeInstanceOf(Error);
    expect(expired).toHaveBeenCalledOnce();
  });

  it("does not overwrite a new login with a delayed saved session", async () => {
    const { restoreSession, saveSession, sessionHeaders } = await import("./api");
    const diskRead = deferred<string>();
    mocks.get.mockReturnValueOnce(diskRead.promise);
    const restoring = restoreSession();
    await saveSession("new-login");
    diskRead.resolve("old-login");
    await restoring;
    expect(sessionHeaders().Authorization).toBe("Bearer new-login");
  });

  it("persists login changes in order when secure storage is slow", async () => {
    const { saveSession, sessionHeaders } = await import("./api");
    const firstWrite = deferred<void>();
    const disk = new Map<string, string>();
    mocks.set.mockImplementationOnce(async (key: string, value: string) => {
      await firstWrite.promise;
      disk.set(key, value);
    }).mockImplementation(async (key: string, value: string) => { disk.set(key, value); });
    const first = saveSession("old-login");
    const second = saveSession("new-login");
    expect(sessionHeaders().Authorization).toBe("Bearer new-login");
    firstWrite.resolve();
    await Promise.all([first, second]);
    expect(disk.get("stoqo.native.session")).toBe("new-login");
  });
});
