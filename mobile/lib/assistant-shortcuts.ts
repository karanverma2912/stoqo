import { api, units } from "./api";
import type { Product } from "./types";
export type StoreShortcut = "summary" | "low" | "out";

// These are ordinary store reads; no AI provider receives this information.
export async function readStoreShortcut(
  kind: StoreShortcut,
  businessId: number,
  language = "en",
) {
  const hindi = language === "hi";
  if (kind === "summary") {
    const { data } = await api<{
      products: number;
      total_units: string;
      low_stock: number;
      out_of_stock: number;
    }>("dashboard", {}, businessId);
    if (hindi)
      return `आपके स्टोर में ${data.products} प्रोडक्ट और ${units(data.total_units)} यूनिट स्टॉक में हैं।\n\n${data.low_stock} प्रोडक्ट का स्टॉक कम है और ${data.out_of_stock} प्रोडक्ट का स्टॉक खत्म है। किसी मौजूदा प्रोडक्ट का स्टॉक जोड़ने या घटाने के लिए इन्वेंटरी खोलें।`;
    return `Your store has ${data.products} products and ${units(data.total_units)} units in stock.\n\n${data.low_stock} products are running low and ${data.out_of_stock} are out of stock. Open Inventory to add or remove stock from an existing product.`;
  }
  const { data, meta } = await api<Product[]>(
    `products?filter=${kind}&per_page=5`,
    {},
    businessId,
  );
  if (!data.length)
    return hindi
      ? kind === "low"
        ? "अभी किसी प्रोडक्ट का स्टॉक कम नहीं है।"
        : "अभी किसी प्रोडक्ट का स्टॉक खत्म नहीं है।"
      : kind === "low"
        ? "No products are running low right now."
        : "No products are out of stock right now.";
  const title = hindi
    ? kind === "low"
      ? "कम स्टॉक वाले प्रोडक्ट"
      : "खत्म स्टॉक वाले प्रोडक्ट"
    : kind === "low"
      ? "Products running low"
      : "Out-of-stock products";
  if (hindi)
    return `${title}: ${meta.total}\n\n${data.map((p) => `${p.display_name || p.name} · ${units(p.current_stock)} ${p.unit}`).join("\n")}\n\n${meta.total > data.length ? "पहले 5 प्रोडक्ट दिखाए गए हैं। " : ""}स्टॉक बदलने के लिए इन्वेंटरी खोलें और ${kind === "low" ? "कम स्टॉक" : "खत्म स्टॉक"} चुनें।`;
  return `${title}: ${meta.total}\n\n${data.map((p) => `${p.display_name || p.name} · ${units(p.current_stock)} ${p.unit}`).join("\n")}\n\n${meta.total > data.length ? "Showing the first 5. " : ""}Open Inventory and choose ${kind === "low" ? "Low stock" : "Out of stock"} to update these products.`;
}
