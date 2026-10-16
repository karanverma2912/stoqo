import { beforeEach, describe, expect, it, vi } from "vitest";
const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("./api", () => ({
  api,
  units: (value: string) => Number(value).toString(),
}));
import { readStoreShortcut } from "./assistant-shortcuts";
beforeEach(() => vi.clearAllMocks());
describe("Store shortcuts without AI", () => {
  it("reads the current store summary and never sends an AI message", async () => {
    api.mockResolvedValue({
      data: {
        products: 16,
        total_units: "289.000",
        low_stock: 3,
        out_of_stock: 2,
      },
    });
    const reply = await readStoreShortcut("summary", 4);
    expect(reply).toContain("16 products and 289 units");
    expect(reply).toContain("3 products are running low and 2");
    expect(api).toHaveBeenCalledExactlyOnceWith("dashboard", {}, 4);
  });
  it("shows a bounded live list including variant names", async () => {
    api.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Rice",
          display_name: "Rice · 1 kg",
          current_stock: "3.000",
          unit: "packs",
        },
      ],
      meta: { total: 1 },
    });
    expect(await readStoreShortcut("low", 4)).toContain(
      "Rice · 1 kg · 3 packs",
    );
    expect(api).toHaveBeenCalledExactlyOnceWith(
      "products?filter=low&per_page=5",
      {},
      4,
    );
  });
  it("handles an empty out-of-stock list", async () => {
    api.mockResolvedValue({ data: [], meta: { total: 0 } });
    expect(await readStoreShortcut("out", 4)).toBe(
      "No products are out of stock right now.",
    );
  });
  it("uses the selected Hindi language for store help", async () => {
    api.mockResolvedValue({
      data: {
        products: 16,
        total_units: "289.000",
        low_stock: 3,
        out_of_stock: 2,
      },
    });
    expect(await readStoreShortcut("summary", 4, "hi")).toContain(
      "16 प्रोडक्ट",
    );
    api.mockResolvedValue({ data: [], meta: { total: 0 } });
    expect(await readStoreShortcut("out", 4, "hi")).toContain(
      "स्टॉक खत्म नहीं है",
    );
  });
});
