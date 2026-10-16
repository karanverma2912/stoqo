import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import type { Envelope } from "./types";
import { ensureServerReady } from "./server-health";
const SESSION_KEY = "stoqo.native.session";
let session: string | null = null;
let generation = 0;
let storageWrite = Promise.resolve();
let expired: (() => void) | undefined;
export function normalizeOrigin(value: string) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Invalid Stoqo server origin");
  if (
    url.protocol !== "https:" &&
    !(typeof __DEV__ !== "undefined" && __DEV__ && url.protocol === "http:")
  )
    throw new Error("Stoqo needs an HTTPS connection");
  return url.origin;
}
export function apiOrigin() {
  const origin =
    Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;
  if (!origin)
    throw new Error("This build needs its Stoqo server connection configured.");
  return normalizeOrigin(origin);
}
export function webOrigin() {
  const origin =
    Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL;
  return origin ? normalizeOrigin(origin) : undefined;
}
// A non-secret identity for rejecting work from a previous login.
export function sessionVersion() {
  return session ? generation : null;
}
export function setExpiredHandler(handler: () => void) {
  expired = handler;
}
export async function restoreSession() {
  const started = generation;
  const saved = await SecureStore.getItemAsync(SESSION_KEY);
  if (generation !== started) return session;
  session = saved;
  generation++;
  return session;
}
export async function saveSession(token: string | null) {
  session = token;
  generation++;
  // Keep disk writes in login order even when an expiry and logout overlap.
  const write = storageWrite
    .catch(() => {})
    .then(() =>
      token
        ? SecureStore.setItemAsync(SESSION_KEY, token)
        : SecureStore.deleteItemAsync(SESSION_KEY),
    );
  storageWrite = write;
  await write;
}
export function sessionHeaders(businessId?: number): Record<string, string> {
  return {
    ...(session ? { Authorization: `Bearer ${session}` } : {}),
    ...(businessId ? { "X-Business-Id": String(businessId) } : {}),
  };
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  businessId?: number,
): Promise<Envelope<T>> {
  if (!/^[a-zA-Z0-9_/?=&%.,+-]+$/.test(path) || path.startsWith("/"))
    throw new Error("Invalid request");
  const requestVersion = sessionVersion();
  await ensureServerReady(apiOrigin());
  if (requestVersion !== sessionVersion())
    throw new Error("Your sign-in changed. Please try again.");
  if (options.signal?.aborted) throw new Error("Request cancelled.");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    path === "assistant/messages" ? 75000 : 45000,
  );
  const isForm = options.body instanceof FormData;
  try {
    const response = await fetch(`${apiOrigin()}/api/v1/${path}`, {
      ...options,
      headers: {
        ...(!isForm ? { "Content-Type": "application/json" } : {}),
        ...sessionHeaders(businessId),
        ...Object.fromEntries(new Headers(options.headers).entries()),
      },
      signal: options.signal ?? controller.signal,
    });
    if (response.status === 204)
      return { data: null as T, meta: {} as Envelope<T>["meta"] };
    const body = await response.json().catch(() => ({
      error: {
        code: "service_unavailable",
        message: "Stoqo is temporarily unavailable. Please retry shortly.",
      },
    }));
    if (!response.ok) {
      if (
        response.status === 401 &&
        requestVersion !== null &&
        sessionVersion() === requestVersion &&
        !path.startsWith("auth/login")
      )
        expired?.();
      throw new ApiError(
        body.error?.message ?? "Please try again.",
        response.status,
        body.error?.code ?? "request_failed",
        body.error?.details,
      );
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new Error(
        "Stoqo took too long to respond. Check your connection and retry.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Could not reach Stoqo. Check your connection and retry.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});
export const patch = (body: unknown): RequestInit => ({
  method: "PATCH",
  body: JSON.stringify(body),
});
export const money = (value: string | number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
export const units = (value: string | number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(
    Number(value),
  );
