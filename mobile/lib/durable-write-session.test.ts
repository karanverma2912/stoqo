import { describe, expect, it, vi } from "vitest";
import { DurableWriteSession, type SavedWrite } from "./durable-write-session";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}
function fixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };
  return { data, storage };
}
const record = (id = "original"): SavedWrite => ({
  version: 1,
  path: "stock_movements",
  body: {
    stock_movement: { product_id: 10, quantity: "2", idempotency_key: id },
  },
});
const keepOnError = () => false;

describe("persisted write isolation", () => {
  it("ignores storage that resolves after its operation is retired", async () => {
    const f = fixture(),
      load = deferred<string | null>(),
      changed = vi.fn();
    f.storage.getItem.mockReturnValueOnce(load.promise);
    const old = new DurableWriteSession("store-A.stock-10", f.storage, changed);
    const restoring = old.restore();
    old.deactivate();
    const current = new DurableWriteSession(
      "store-B.stock-20",
      f.storage,
      vi.fn(),
    );
    await current.restore();
    load.resolve(JSON.stringify(record()));
    await restoring;
    expect(changed).not.toHaveBeenCalled();
    expect(current.pending).toBeNull();
    expect(current.ready).toBe(true);
  });

  it("clears only the original request when another operation is active", async () => {
    const f = fixture(),
      response = deferred<string>(),
      changed = vi.fn();
    const old = new DurableWriteSession("A", f.storage, changed);
    await old.restore();
    const result = old.execute(
      () => record("A"),
      () => response.promise,
      keepOnError,
    );
    const rejected = expect(result).rejects.toThrow("changed while");
    await Promise.resolve();
    old.deactivate();
    changed.mockClear();
    f.data.set("B", JSON.stringify(record("B")));
    const current = new DurableWriteSession("B", f.storage, vi.fn());
    await current.restore();
    response.resolve("accepted");
    await rejected;
    expect(f.data.has("A")).toBe(false);
    expect(f.data.get("B")).toBe(JSON.stringify(record("B")));
    expect(current.pending).toEqual(record("B"));
    expect(changed).not.toHaveBeenCalled();
  });

  it("retries the frozen request after an uncertain response and reopening", async () => {
    const f = fixture(),
      original = new DurableWriteSession("A", f.storage, vi.fn());
    await original.restore();
    await expect(
      original.execute(
        () => record(),
        async () => {
          throw new Error("timeout");
        },
        keepOnError,
      ),
    ).rejects.toThrow("timeout");
    original.deactivate();
    const reopened = new DurableWriteSession("A", f.storage, vi.fn());
    await reopened.restore();
    const create = vi.fn(() => record("replacement")),
      send = vi.fn(async () => "accepted");
    await reopened.execute(create, send, keepOnError);
    expect(create).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledExactlyOnceWith(record());
    expect(f.data.has("A")).toBe(false);
  });

  it("never sends a mutation when durable storage fails", async () => {
    const f = fixture(),
      session = new DurableWriteSession("A", f.storage, vi.fn());
    await session.restore();
    f.storage.setItem.mockRejectedValueOnce(new Error("storage full"));
    const send = vi.fn(async () => "accepted");
    await expect(
      session.execute(() => record(), send, keepOnError),
    ).rejects.toThrow("storage full");
    expect(send).not.toHaveBeenCalled();
    expect(session.pending).toBeNull();
  });

  it("preserves an unsent request if navigation occurs while saving", async () => {
    const f = fixture(),
      persisted = deferred<void>(),
      changed = vi.fn();
    f.storage.setItem.mockImplementationOnce(async (key, value) => {
      await persisted.promise;
      f.data.set(key, value);
    });
    const session = new DurableWriteSession("A", f.storage, changed);
    await session.restore();
    const send = vi.fn(async () => "accepted");
    const result = session.execute(() => record(), send, keepOnError);
    const rejected = expect(result).rejects.toThrow("changed before");
    session.deactivate();
    changed.mockClear();
    persisted.resolve();
    await rejected;
    expect(send).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(f.data.get("A")).toBe(JSON.stringify(record()));
  });

  it("blocks concurrent taps while the first request is unresolved", async () => {
    const f = fixture(),
      response = deferred<string>();
    const session = new DurableWriteSession("A", f.storage, vi.fn());
    await session.restore();
    const send = vi.fn(() => response.promise);
    const result = session.execute(() => record(), send, keepOnError);
    await expect(
      session.execute(() => record("second"), send, keepOnError),
    ).rejects.toThrow("already in progress");
    response.resolve("accepted");
    expect(await result).toBe("accepted");
    expect(send).toHaveBeenCalledOnce();
  });

  it("leaves corrupt saved requests intact and blocks new writes", async () => {
    const f = fixture();
    f.data.set("A", JSON.stringify({ version: 1, path: "products", body: [] }));
    const session = new DurableWriteSession("A", f.storage, vi.fn());
    await session.restore();
    expect(session.ready).toBe(false);
    expect(session.error).toContain("could not be restored");
    expect(f.data.has("A")).toBe(true);
    const send = vi.fn(async () => "accepted");
    await expect(
      session.execute(() => record(), send, keepOnError),
    ).rejects.toThrow("Wait for saved requests");
    expect(send).not.toHaveBeenCalled();
  });

  it("unlocks a request only after a definitive validation rejection", async () => {
    const f = fixture(),
      invalid = new Error("not enough stock");
    const session = new DurableWriteSession("A", f.storage, vi.fn());
    await session.restore();
    await expect(
      session.execute(
        () => record(),
        async () => {
          throw invalid;
        },
        (error) => error === invalid,
      ),
    ).rejects.toThrow("not enough stock");
    expect(session.pending).toBeNull();
    expect(f.data.has("A")).toBe(false);
  });
});
