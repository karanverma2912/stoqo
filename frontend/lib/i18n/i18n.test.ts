import { describe, expect, it } from "vitest";
import { translate } from "./index";
import hindi from "./hi.json";

describe("app translations", () => {
  it("covers each main area and leaves English unchanged", () => {
    for (const text of [
      "Overview",
      "Inventory",
      "Reports",
      "Settings",
      "Account security",
      "Your team",
      "Plans & usage",
      "Product name",
      "Create your account",
      "Barcode labels",
    ]) {
      expect(translate("hi", text)).not.toBe(text);
      expect(translate("en", text)).toBe(text);
    }
  });
  it("preserves interpolated names and identifiers without treating them as translation keys", () => {
    expect(translate("hi", "View {name}", { name: "English / SKU-123" })).toBe(
      "English / SKU-123 देखें",
    );
    expect(translate("hi", "Uncatalogued product SKU-123")).toBe(
      "Uncatalogued product SKU-123",
    );
    expect(translate("en", "View {name}", { name: "हिन्दी Tee" })).toBe(
      "View हिन्दी Tee",
    );
  });
  it("translates known server message templates while preserving their values", () => {
    expect(translate("hi", "My Tee is running low")).toBe(
      "My Tee का स्टॉक कम है",
    );
    expect(
      translate("hi", "Imported 12 products. 2 rows need attention."),
    ).toBe("12 सामान इम्पोर्ट हुए। 2 पंक्तियों में सुधार चाहिए।");
  });
  it("keeps placeholder names consistent between languages", () => {
    for (const [key, value] of Object.entries(hindi)) {
      expect(
        [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
        key,
      ).toEqual([...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort());
    }
  });
});
