import { describe, expect, it } from "vitest";
import { stockChange } from "./stock-change";
describe("Stock adjustment quantities", () => {
  it("adds and removes existing stock in decimal units", () => {
    expect(stockChange(" 2.125 ", "stock_in", "10")).toBe("2.125");
    expect(stockChange("10", "stock_out", "10")).toBe("-10");
    expect(stockChange("1.5", "damage", "10")).toBe("-1.5");
  });
  it.each([
    "-5",
    "--5",
    "0",
    "NaN",
    "Infinity",
    "1e3",
    "2.0001",
    "100000000",
    "",
  ])("rejects invalid quantity %s", (value) => {
    expect(() => stockChange(value, "stock_in", "10")).toThrow();
    expect(() => stockChange(value, "stock_out", "10")).toThrow();
  });
  it("rejects removal beyond the available quantity", () => {
    expect(() => stockChange("10.001", "stock_out", "10")).toThrow(
      "cannot remove",
    );
    expect(stockChange("10.001", "stock_in", "0")).toBe("10.001");
  });
});
