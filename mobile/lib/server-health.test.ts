import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Server wake-up", () => {
  it("shares one anonymous readiness request before sending store requests", async () => {
    let resolve!: (value: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const { ensureServerReady, connectionSnapshot } = await import(
      "./server-health"
    );
    const first = ensureServerReady("https://stoqo-api.onrender.com");
    const second = ensureServerReady("https://stoqo-api.onrender.com");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]).toEqual([
      "https://stoqo-api.onrender.com/ready",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    ]);
    await vi.advanceTimersByTimeAsync(3500);
    expect(connectionSnapshot()).toBe("slow");
    resolve(new Response('{"status":"ready"}'));
    await Promise.all([first, second]);
    expect(connectionSnapshot()).toBe("ready");
    await ensureServerReady("https://stoqo-api.onrender.com");
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    const next = ensureServerReady("https://stoqo-api.onrender.com");
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve(new Response('{"status":"ready"}'));
    await next;
  });
  it("does not cache failed readiness and allows an explicit retry", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValue(new Response('{"status":"ready"}'));
    vi.stubGlobal("fetch", fetch);
    const { ensureServerReady, connectionSnapshot } = await import(
      "./server-health"
    );
    await expect(
      ensureServerReady("https://stoqo-api.onrender.com"),
    ).rejects.toThrow("still connecting");
    expect(connectionSnapshot()).toBe("error");
    await ensureServerReady("https://stoqo-api.onrender.com");
    expect(connectionSnapshot()).toBe("ready");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("stops a stalled cold start after 90 seconds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      ),
    );
    const { ensureServerReady, connectionSnapshot } = await import(
      "./server-health"
    );
    const result = ensureServerReady("https://stoqo-api.onrender.com").catch(
      (e: Error) => e,
    );
    await vi.advanceTimersByTimeAsync(90_000);
    expect(await result).toBeInstanceOf(Error);
    expect(connectionSnapshot()).toBe("error");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("recovers if a native fetch implementation throws synchronously", async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new TypeError("offline");
      })
      .mockResolvedValue(new Response('{"status":"ready"}'));
    vi.stubGlobal("fetch", fetch);
    const { ensureServerReady } = await import("./server-health");
    await expect(
      ensureServerReady("https://stoqo-api.onrender.com"),
    ).rejects.toThrow("still connecting");
    await ensureServerReady("https://stoqo-api.onrender.com");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
