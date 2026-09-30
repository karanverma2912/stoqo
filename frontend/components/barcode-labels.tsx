"use client";
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, LoaderCircle, WandSparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, money } from "@/lib/api";
import type { Business, Product } from "@/lib/types";
import { Sheet } from "./ui/sheet";
function printable(code?: string) {
  return !!code && (/^[\x20-\x7e]{1,16}$/.test(code)||/^\d{1,32}$/.test(code));
}
function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current)
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height: 48,
        width: 2,
        margin: 20,
        displayValue: true,
        fontSize: 14,
        background: "#fff",
        lineColor: "#000",
      });
  }, [value]);
  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} />;
}
export default function BarcodeLabels({
  products,
  business,
  onClose,
}: {
  products: Product[];
  business: Business;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(products),
    [copies, setCopies] = useState<Record<number, string>>(() =>
      Object.fromEntries(products.map((p) => [p.id, "1"])),
    ),
    [showPrice, setShowPrice] = useState(true),
    [busy, setBusy] = useState<number>(),
    [error, setError] = useState("");
  const client = useQueryClient();
  const total = rows.reduce((n, p) => n + Number(copies[p.id] || 0), 0),
    valid =
      rows.every(
        (p) =>
          Number.isInteger(Number(copies[p.id] || 0)) &&
          +copies[p.id] >= 0 &&
          +copies[p.id] <= 100 &&
          (!Number(copies[p.id]) || printable(p.barcode)),
      ) &&
      total > 0 &&
      total <= 300;
  async function generate(p: Product) {
    setBusy(p.id);
    setError("");
    try {
      const result = await api<Product>(
        `products/${p.id}/generate_barcode`,
        { method: "POST" },
        business.id,
      );
      setRows((all) => all.map((x) => (x.id === p.id ? result.data : x)));
      await client.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <Sheet
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Barcode labels"
      description="Choose copies, then print or save a PDF. These labels use your saved product codes."
    >
      <div className="label-settings">
        <p className="muted">
          50 × 30 mm labels on A4. Print at 100% scale with browser headers and
          footers off. Try one page before printing a batch.
        </p>
        <label className="setup-checkbox">
          <input
            type="checkbox"
            checked={showPrice}
            onChange={(e) => setShowPrice(e.target.checked)}
          />
          Include selling price
        </label>
        {rows.map((p) => (
          <div className="label-option" key={p.id}>
            <div>
              <strong>{p.display_name || p.name}</strong>
              <small>{p.barcode || "No barcode yet"}</small>
              {p.barcode && !printable(p.barcode) && (
                <small className="setup-warning">
                  This code needs a larger label or a supported barcode format.
                  Set copies to 0 to skip it.
                </small>
              )}
              {!p.barcode && business.role !== "staff" && (
                <button
                  className="button subtle"
                  disabled={busy !== undefined}
                  onClick={() => generate(p)}
                >
                  {busy === p.id ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <WandSparkles size={16} />
                  )}
                  Generate code
                </button>
              )}
              {!p.barcode && business.role === "staff" && (
                <small>
                  Ask a manager to generate a code, or set copies to 0.
                </small>
              )}
            </div>
            <label>
              Copies
              <input
                aria-label={`Label copies for ${p.display_name || p.name}`}
                type="number"
                min="0"
                max="100"
                value={copies[p.id] ?? "0"}
                onChange={(e) =>
                  setCopies({ ...copies, [p.id]: e.target.value })
                }
              />
            </label>
          </div>
        ))}
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <p aria-live="polite">
          {Number.isFinite(total) ? total : 0} labels · maximum 300 per batch
        </p>
        <button
          className="button primary full"
          disabled={!valid || busy !== undefined}
          onClick={() => window.print()}
        >
          <Printer size={18} />
          Print / Save PDF
        </button>
      </div>
      <div className="barcode-print-grid" aria-label="Label preview">
        {valid &&
          rows.flatMap((p) =>
            Array.from({ length: Number(copies[p.id] || 0) }, (_, i) => (
              <div className="barcode-label" key={`${p.id}-${i}`}>
                <strong>{p.display_name || p.name}</strong>
                {showPrice && (
                  <span>{money(p.selling_price, business.currency)}</span>
                )}
                <Barcode value={p.barcode!} />
              </div>
            )),
          )}
      </div>
    </Sheet>
  );
}
