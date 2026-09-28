import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ApiError, units, money } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("API boundary", () => {
  it("passes business context and uses same-origin API", async () => {
    const f = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], meta: {} }),
      });
    vi.stubGlobal("fetch", f);
    await api("products", {}, 42);
    expect(f.mock.calls[0][0]).toBe("/api/backend/products");
    expect(f.mock.calls[0][1].headers.get("X-Business-Id")).toBe("42");
  });
  it("preserves server errors instead of returning successful data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 422,
          json: async () => ({
            error: { message: "Not enough stock available" },
          }),
        }),
    );
    await expect(api("stock_movements")).rejects.toThrow(
      "Not enough stock available",
    );
  });
  it("keeps multipart uploads without a JSON content type", async () => {
    const f = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: {}, meta: {} }),
      });
    vi.stubGlobal("fetch", f);
    await api("products", { method: "POST", body: new FormData() }, 1);
    expect(f.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
  });
  it("retains fractional stock in display", () => {
    expect(units("1.125")).toBe("1.125");
    expect(money("149", "INR")).toContain("149");
  });
});
