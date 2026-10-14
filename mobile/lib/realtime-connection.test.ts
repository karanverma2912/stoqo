import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRealtimeConnection,
  type RealtimeSocket,
} from "./realtime-connection";

class Socket implements RealtimeSocket {
  onopen: RealtimeSocket["onopen"] = null;
  onmessage: RealtimeSocket["onmessage"] = null;
  onclose: RealtimeSocket["onclose"] = null;
  onerror: RealtimeSocket["onerror"] = null;
  send = vi.fn();
  close = vi.fn();
  open() {
    this.onopen?.call(this as unknown as WebSocket, {} as Event);
  }
  message(frame: unknown) {
    this.onmessage?.call(
      this as unknown as WebSocket,
      {
        data: JSON.stringify(frame),
      } as MessageEvent,
    );
  }
  dropped() {
    this.onclose?.call(this as unknown as WebSocket, {} as CloseEvent);
  }
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
function fixture(
  getTicket: () => Promise<string> = vi.fn(async () => "ticket"),
) {
  const sockets: Socket[] = [];
  const onConnected = vi.fn(),
    onEvent = vi.fn(),
    onAccessChanged = vi.fn();
  const createSocket = vi.fn(() => {
    const socket = new Socket();
    sockets.push(socket);
    return socket;
  });
  const connection = createRealtimeConnection({
    businessId: 42,
    getTicket,
    socketUrl: (ticket) => `wss://api.example/cable?ticket=${ticket}`,
    createSocket,
    onConnected,
    onEvent,
    onAccessChanged,
  });
  return {
    connection,
    sockets,
    getTicket,
    createSocket,
    onConnected,
    onEvent,
    onAccessChanged,
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("foreground realtime lifecycle", () => {
  it("opens only one connection when foreground events overlap", async () => {
    const f = fixture();
    f.connection.resume();
    f.connection.resume();
    await flush();
    f.connection.resume();
    expect(f.getTicket).toHaveBeenCalledTimes(1);
    expect(f.sockets).toHaveLength(1);
    f.connection.stop();
  });

  it("ignores a ticket from before a background/foreground transition", async () => {
    let finishOld!: (ticket: string) => void;
    let finishNew!: (ticket: string) => void;
    const getTicket = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishNew = resolve;
          }),
      );
    const f = fixture(getTicket);
    f.connection.resume();
    f.connection.suspend();
    f.connection.resume();
    finishOld("retired");
    await flush();
    expect(f.sockets).toHaveLength(0);
    finishNew("current");
    await flush();
    expect(f.createSocket).toHaveBeenCalledExactlyOnceWith(
      "wss://api.example/cable?ticket=current",
    );
    f.connection.stop();
  });

  it("never opens a socket when a retired store ticket resolves", async () => {
    let resolve!: (ticket: string) => void;
    const f = fixture(
      () =>
        new Promise<string>((finish) => {
          resolve = finish;
        }),
    );
    f.connection.resume();
    f.connection.stop();
    resolve("old-store");
    await flush();
    f.connection.resume();
    expect(f.sockets).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("requires confirmation of both user and the current store", async () => {
    const f = fixture();
    f.connection.resume();
    await flush();
    const socket = f.sockets[0];
    socket.open();
    socket.message({
      type: "confirm_subscription",
      identifier: JSON.stringify({
        channel: "WorkspaceChannel",
        business_id: 99,
      }),
    });
    socket.message({
      type: "confirm_subscription",
      identifier: JSON.stringify({ channel: "UserChannel" }),
    });
    expect(f.onConnected).not.toHaveBeenCalledWith(true);
    socket.message({
      type: "confirm_subscription",
      identifier: JSON.stringify({
        channel: "WorkspaceChannel",
        business_id: 42,
      }),
    });
    expect(f.onConnected).toHaveBeenCalledWith(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(socket.send).toHaveBeenCalledTimes(2);
    f.connection.stop();
  });

  it("retries an unresponsive handshake instead of staying stuck", async () => {
    const f = fixture();
    f.connection.resume();
    await flush();
    await vi.advanceTimersByTimeAsync(10000);
    expect(f.sockets[0].close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.sockets).toHaveLength(2);
    f.connection.stop();
  });

  it("ignores late callbacks from an already replaced socket", async () => {
    const f = fixture();
    f.connection.resume();
    await flush();
    const oldClose = f.sockets[0].onclose;
    f.sockets[0].dropped();
    await vi.advanceTimersByTimeAsync(1000);
    oldClose?.call({} as WebSocket, {} as CloseEvent);
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.sockets).toHaveLength(2);
    f.connection.stop();
  });

  it("cancels retries while the app is in the background", async () => {
    const getTicket = vi.fn().mockRejectedValue(new Error("offline"));
    const f = fixture(getTicket);
    f.connection.resume();
    await flush();
    f.connection.suspend();
    await vi.advanceTimersByTimeAsync(60000);
    expect(getTicket).toHaveBeenCalledTimes(1);
    f.connection.resume();
    await flush();
    expect(getTicket).toHaveBeenCalledTimes(2);
    f.connection.stop();
  });

  it("refreshes access and respects a server instruction not to reconnect", async () => {
    const f = fixture();
    f.connection.resume();
    await flush();
    f.sockets[0].message({ type: "disconnect", reconnect: false });
    await vi.advanceTimersByTimeAsync(60000);
    expect(f.onAccessChanged).toHaveBeenCalledOnce();
    expect(f.getTicket).toHaveBeenCalledTimes(1);
    expect(f.onConnected).not.toHaveBeenCalledWith(true);
    f.connection.stop();
  });

  it("refreshes access on a rejected subscription", async () => {
    const f = fixture();
    f.connection.resume();
    await flush();
    f.sockets[0].message({ type: "reject_subscription" });
    expect(f.onAccessChanged).toHaveBeenCalledOnce();
    expect(f.sockets[0].close).toHaveBeenCalledOnce();
    f.connection.stop();
  });

  it("does not deliver old store events after cleanup", async () => {
    const f = fixture();
    f.connection.resume();
    await flush();
    const oldMessage = f.sockets[0].onmessage;
    f.sockets[0].message({
      message: { type: "stock_changed", business_id: 42 },
    });
    f.connection.stop();
    oldMessage?.call(
      {} as WebSocket,
      {
        data: JSON.stringify({
          message: { type: "stock_changed", business_id: 42 },
        }),
      } as MessageEvent,
    );
    expect(f.onEvent).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
