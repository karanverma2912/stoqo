import { describe, expect, it } from "vitest";
import { notificationTarget } from "./notification-target";

describe("Notification navigation payloads", () => {
  it("accepts the server's store and notification IDs", () => {
    expect(notificationTarget({ business_id: 12, notification_id: 34, route: "notifications" }))
      .toEqual({ businessId: 12, notificationId: 34 });
    expect(notificationTarget({ business_id: "12", route: "notifications" }))
      .toEqual({ businessId: 12 });
  });
  it("rejects arbitrary destinations and malformed store IDs", () => {
    expect(notificationTarget({ business_id: 12, route: "https://foreign.site" })).toBeNull();
    for (const business_id of [true, [12], "12/../auth", "1e2", "", -1, 0, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(notificationTarget({ business_id, route: "notifications" })).toBeNull();
    }
  });
});
