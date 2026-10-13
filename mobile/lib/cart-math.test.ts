import { describe, expect, it } from "vitest";
import { cartTotal, lineCents } from "./cart-math";
describe("Checkout amount precision", () => {
  it("matches the backend for fractional weight at a two-decimal price", () => {
    expect(lineCents("2.345", "19.99")).toBe(4688n);
  });
  it("rounds each line before adding them to the bill", () => {
    expect(
      cartTotal(
        [
          { quantity: "0.001", unit_price: "15.00" },
          { quantity: "0.001", unit_price: "15.00" },
        ],
        "0",
      ),
    ).toEqual({ subtotal: "0.04", total: "0.04" });
  });
  it("keeps decimal discounts exact", () => {
    expect(
      cartTotal([{ quantity: "3", unit_price: "0.10" }], "0.10").total,
    ).toBe("0.20");
  });
  it("rejects excess discounts and negative or non-finite quantities", () => {
    expect(() =>
      cartTotal([{ quantity: "1", unit_price: "10" }], "11"),
    ).toThrow();
    for (const q of ["-1", "NaN", "1e5", "0", "0.0001"])
      expect(() => lineCents(q, "10")).toThrow();
  });
});
