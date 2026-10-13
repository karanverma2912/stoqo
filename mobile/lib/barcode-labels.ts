import JsBarcode from "jsbarcode";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Product } from "./types";
import { escapeHtml } from "./receipts";
export async function printLabels(products: Product[]) {
  const labels = products
    .filter((p) => p.barcode)
    .map((p) => {
      const target: { encodings?: { data: string }[] } = {};
      JsBarcode(target, p.barcode!, { format: "CODE128", displayValue: false });
      const bits = target.encodings?.map((e) => e.data).join("") ?? "";
      const width = bits.length + 24;
      const bars = [...bits]
        .map((bit, index) =>
          bit === "1"
            ? `<rect x="${index + 12}" y="0" width="1" height="50"/>`
            : "",
        )
        .join("");
      return `<section><strong>${escapeHtml(p.display_name || p.name)}</strong><svg xmlns="http://www.w3.org/2000/svg" width="220" height="58" viewBox="0 0 ${width} 58"><g fill="black">${bars}</g></svg><span>${escapeHtml(p.barcode)}</span></section>`;
    });
  if (!labels.length)
    throw new Error("Generate or add a barcode before printing labels.");
  const result = await Print.printToFileAsync({
    html: `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;display:flex;flex-wrap:wrap;gap:12px;padding:12px}section{width:230px;border:1px dashed #aaa;padding:12px;text-align:center;break-inside:avoid}strong,span{display:block;font-size:12px;margin:5px 0}svg{max-width:100%}</style></head><body>${labels.join("")}</body></html>`,
  });
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  else await Print.printAsync({ uri: result.uri });
}
