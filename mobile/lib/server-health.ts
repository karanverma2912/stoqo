type Connection = "idle" | "connecting" | "slow" | "ready" | "error";
let connection: Connection = "idle";
let healthyAt = 0;
let healthyOrigin = "";
let warming: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const connectionSnapshot = () => connection;
export function subscribeConnection(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(value: Connection) {
  connection = value;
  listeners.forEach((listener) => listener());
}
export function ensureServerReady(origin: string) {
  if (healthyOrigin === origin && Date.now() - healthyAt < 10 * 60_000)
    return Promise.resolve();
  if (warming) return warming;
  publish("connecting");
  const controller = new AbortController();
  const slow = setTimeout(() => publish("slow"), 3500);
  const timeout = setTimeout(() => controller.abort(), 90_000);
  warming = (async () => {
    try {
      // Public readiness only: never attach a login token or replay a write.
      const response = await fetch(`${origin}/ready`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        credentials: "omit",
        cache: "no-store",
      });
      if (!response.ok || (await response.json()).status !== "ready")
        throw new Error("not ready");
      healthyOrigin = origin;
      healthyAt = Date.now();
      publish("ready");
    } catch {
      publish("error");
      throw new Error(
        "Your store server is still connecting. Please check your internet connection and retry in a moment.",
      );
    } finally {
      clearTimeout(slow);
      clearTimeout(timeout);
    }
  })().finally(() => {
    warming = undefined;
  });
  return warming;
}
