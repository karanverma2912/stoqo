import type { Product } from "./types";
export type ProductGroup = {
  id: number;
  name: string;
  variant_count: number;
  products?: Product[];
};
export type VariantDraft = {
  size: string;
  color: string;
  selling_price: string;
  purchase_price: string;
  initial_quantity: string;
  sku: string;
  barcode: string;
};
export function variantMatrix(
  sizes: string,
  colors: string,
  price: string,
  quantity: string,
): VariantDraft[] {
  const split = (text: string) => {
    const values = text
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return values.filter(
      (x, i) =>
        values.findIndex((v) => v.toLowerCase() === x.toLowerCase()) === i,
    );
  };
  const ss = split(sizes),
    cs = split(colors);
  if (!ss.length && !cs.length)
    throw new Error("Enter at least one size or colour");
  if ((ss.length || 1) * (cs.length || 1) > 100)
    throw new Error("Create up to 100 variants at a time");
  if ([...ss, ...cs].some((x) => x.length > 60))
    throw new Error("Keep sizes and colours under 60 characters");
  return (cs.length ? cs : [""]).flatMap((color) =>
    (ss.length ? ss : [""]).map((size) => ({
      size,
      color,
      selling_price: price || "0",
      purchase_price: "0",
      initial_quantity: quantity || "0",
      sku: "",
      barcode: "",
    })),
  );
}
