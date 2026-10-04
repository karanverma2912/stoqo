import { describe, expect, it } from "vitest";
import { createDraft, readDrafts, hydrateDraft } from "./checkout-drafts";
import type { Product } from "./types";
const product: Product = {
  id: 1,
  name: "Tee",
  selling_price: "599",
  purchase_price: "300",
  current_stock: "8",
  low_stock_threshold: "5",
  unit: "units",
  stock_status: "healthy",
};
const draft = () =>
  createDraft(
    [{ product, quantity: "2", price: "499" }],
    "10",
    "Customer",
    "123",
    "cash",
  );
describe("checkout recovery", () => {
  it("stores only the required bill data, without purchase costs or cached stock", () => {
    const saved = draft();
    const raw = JSON.stringify({ version: 1, active: saved, held: [saved] });
    expect(raw).not.toContain("purchase_price");
    expect(raw).not.toContain("current_stock");
    expect(readDrafts(raw).active?.customer).toBe("Customer");
  });
  it("rejects corrupt or unsupported saved data without treating it as an empty cart", () => {
    expect(() => readDrafts("oops")).toThrow();
    expect(() => readDrafts('{"version":2,"active":null,"held":[]}')).toThrow();
    expect(readDrafts(null).held).toEqual([]);
  });
  it("refreshes stock and restores agreed prices only for authorized cashiers", async () => {
    const fetchProduct = async () => ({
      ...product,
      current_stock: "1",
      selling_price: "699",
    });
    const owner = await hydrateDraft(draft(), fetchProduct, true);
    expect(owner[0]).toMatchObject({
      quantity: "2",
      price: "499",
      product: { current_stock: "1" },
    });
    const staff = await hydrateDraft(draft(), fetchProduct, false);
    expect(staff[0].price).toBe("699.00");
  });
  it("fails recovery on a connection error rather than dropping products", async () => {
    await expect(
      hydrateDraft(
        draft(),
        async () => {
          throw new Error("offline");
        },
        true,
      ),
    ).rejects.toThrow("offline");
  });
});
