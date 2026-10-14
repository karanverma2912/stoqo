export type NotificationTarget = { businessId: number; notificationId?: number };

function id(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !/^[1-9]\d*$/.test(value)) return undefined;
  const result = Number(value);
  return Number.isSafeInteger(result) && result > 0 ? result : undefined;
}

export function notificationTarget(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const businessId = id(payload.business_id);
  // Push messages select only the notifications screen, never arbitrary URLs.
  if (!businessId || payload.route !== "notifications") return null;
  const notificationId = id(payload.notification_id);
  return { businessId, ...(notificationId ? { notificationId } : {}) };
}
