import type { Envelope } from "./types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
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
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (businessId) headers.set("X-Business-Id", String(businessId));
  const res = await fetch(`/api/backend/${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (res.status === 204)
    return { data: null as T, meta: {} as Envelope<T>["meta"] };
  const body = await res.json();
  if (!res.ok)
    throw new ApiError(
      body.error?.message || "Something went wrong. Please try again.",
      res.status,
      body.error?.details,
    );
  return body;
}
export const money = (value: string | number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
export const units = (value: string | number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(
    Number(value),
  );
