import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  ready: vi.fn(),
  constants: {
    expoConfig: {
      extra: {
        apiUrl: "https://stoqo-api.onrender.com",
        webUrl: "https://stoqo-web.onrender.com",
      },
    },
  },
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: mocks.get,
  setItemAsync: mocks.set,
  deleteItemAsync: mocks.remove,
}));
vi.mock("expo-constants", () => ({ default: mocks.constants }));
vi.mock("./server-health", () => ({ ensureServerReady: mocks.ready }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(null);
  mocks.set.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  mocks.ready.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("Native login isolation and recovery", () => {
  it("shows the rate-limit wait without retrying a write or ending the session", async () => {
    const { api, ApiError, saveSession, setExpiredHandler, post } =
      await import("./api");
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "rate_limited", message: "Slow down", details: {} },
          }),
          { status: 429, headers: { "Retry-After": "45" } },
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const expired = vi.fn();
    setExpiredHandler(expired);
    await saveSession("current-login");
    const failure = await api(
      "stock_movements",
      post({ stock_movement: { quantity: "2" } }),
      4,
    ).catch((error) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.retryAfter).toBe(45);
    expect(failure.message).toContain("wait 45 seconds");
    expect(failure.code).toBe("rate_limited");
    expect(fetch).toHaveBeenCalledOnce();
    expect(expired).not.toHaveBeenCalled();
  });

  it("uses a body retry interval when a proxy omits the Retry-After header", async () => {
    const { api } = await import("./api");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: "rate_limited", retry_after: 25 },
            }),
            { status: 429 },
          ),
      ),
    );
    const failure = await api("products").catch((error) => error);
    expect(failure.retryAfter).toBe(25);
    expect(failure.message).toContain("wait 25 seconds");
  });

  it("does not send a write for an old login after waiting for a cold server", async () => {
    const { api, saveSession, post } = await import("./api");
    const wake = deferred<void>();
    mocks.ready.mockReturnValueOnce(wake.promise);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await saveSession("old-login");
    const request = api(
      "stock_movements",
      post({ stock_movement: { quantity: "2" } }),
      4,
    ).catch((e: Error) => e);
    await saveSession("new-login");
    wake.resolve();
    expect(((await request) as Error).message).toContain("sign-in changed");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves password validation details from a rejected signup", async () => {
    const { api, ApiError, post } = await import("./api");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "validation_error",
                message: "Please check the highlighted details",
                details: {
                  password: ["is too short (minimum is 12 characters)"],
                },
              },
            }),
            { status: 422 },
          ),
      ),
    );
    const failure = await api(
      "auth/signup",
      post({ user: { password: "short" } }),
    ).catch((error) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.details).toEqual({
      password: ["is too short (minimum is 12 characters)"],
    });
  });
  it("reads the bundled server origins without requiring a GitHub environment", async () => {
    const { apiOrigin, webOrigin } = await import("./api");
    expect(apiOrigin()).toBe("https://stoqo-api.onrender.com");
    expect(webOrigin()).toBe("https://stoqo-web.onrender.com");
  });

  it("does not expire a new login when an earlier request returns 401", async () => {
    const { api, saveSession, setExpiredHandler } = await import("./api");
    const response = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response.promise),
    );
    const expired = vi.fn();
    setExpiredHandler(expired);
    await saveSession("first-login");
    const request = api("auth/me").catch((error: Error) => error);
    await saveSession("new-login");
    response.resolve(
      new Response(JSON.stringify({ error: { message: "Expired" } }), {
        status: 401,
      }),
    );
    expect(await request).toBeInstanceOf(Error);
    expect(expired).not.toHaveBeenCalled();
  });

  it("expires only authenticated requests belonging to the current login", async () => {
    const { api, saveSession, setExpiredHandler } = await import("./api");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    const expired = vi.fn();
    setExpiredHandler(expired);
    await expect(api("auth/forgot_password")).rejects.toBeInstanceOf(Error);
    expect(expired).not.toHaveBeenCalled();
    await saveSession("current-login");
    await expect(api("auth/me")).rejects.toBeInstanceOf(Error);
    expect(expired).toHaveBeenCalledOnce();
  });

  it("does not overwrite a new login with a delayed saved session", async () => {
    const { restoreSession, saveSession, sessionHeaders } =
      await import("./api");
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
    mocks.set
      .mockImplementationOnce(async (key: string, value: string) => {
        await firstWrite.promise;
        disk.set(key, value);
      })
      .mockImplementation(async (key: string, value: string) => {
        disk.set(key, value);
      });
    const first = saveSession("old-login");
    const second = saveSession("new-login");
    expect(sessionHeaders().Authorization).toBe("Bearer new-login");
    firstWrite.resolve();
    await Promise.all([first, second]);
    expect(disk.get("stoqo.native.session")).toBe("new-login");
  });
});
