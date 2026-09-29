import { describe, it, expect } from "vitest";
import { lineCents } from "./sales";
describe("receipt amounts", () => {
  it("rounds fractional quantities to cents without floating point loss", () => {
    expect(lineCents("1.005", "10")).toBe(1005);
    expect(lineCents("0.125", "0.04")).toBe(1);
    expect(lineCents("3", "10.01")).toBe(3003);
  });
  it("rejects negative and over-precision input", () => {
    for (const [q, p] of [
      ["-1", "10"],
      ["1.0001", "10"],
      ["1", "3.141"],
      ["", "10"],
    ])
      expect(lineCents(q, p)).toBeNaN();
  });
});
