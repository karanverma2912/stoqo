"use client";

import { useLanguage } from "@/components/language-provider";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  ArrowUpRight,
  ChevronDown,
  Upload,
  Download,
  Check,
  LoaderCircle,
} from "lucide-react";
import { api, units } from "@/lib/api";
import type { Product } from "@/lib/types";
const price = z
  .string()
  .refine(
    (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
    "Use a positive amount with up to 2 decimals",
  );
const quantity = z
  .string()
  .refine(
    (v) => v === "" || /^\d+(\.\d{1,3})?$/.test(v),
    "Use a positive quantity with up to 3 decimals",
  );
export const productSchema = z.object({
  name: z.string().trim().min(1, "Give your product a name").max(200),
  size: z.string().max(60),
  color: z.string().max(60),
  selling_price: price,
  purchase_price: price,
  initial_quantity: quantity,
  low_stock_threshold: quantity,
  sku: z.string().max(100),
  barcode: z.string().max(100),
  category_id: z.string(),
  unit: z.string().min(1).max(30),
  description: z.string().max(3000),
});
type ProductFields = z.infer<typeof productSchema>;
export function ProductForm({
  businessId,
  canViewCosts = false,
  product,
  barcode,
  onDone,
}: {
  businessId: number;
  canViewCosts?: boolean;
  product?: Product;
  barcode?: string;
  onDone: () => void;
}) {
  const { tr, language } = useLanguage();
  const [error, setError] = useState("");
  const [image, setImage] = useState<File>();
  const cats = useQuery({
    queryKey: ["categories", businessId],
    queryFn: () =>
      api<{ id: number; name: string }[]>("categories", {}, businessId),
  });
  const [newCategory, setNewCategory] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFields>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      size: product?.size || "",
      color: product?.color || "",
      selling_price: product?.selling_price || "",
      purchase_price: product?.purchase_price || "",
      initial_quantity: "",
      low_stock_threshold: product?.low_stock_threshold || "5",
      sku: product?.sku || "",
      barcode: product?.barcode || barcode || "",
      category_id: String(product?.category_id || ""),
      unit: product?.unit || "units",
      description: product?.description || "",
    },
  });
  async function submit(values: ProductFields) {
    setError("");
    try {
      let category = values.category_id;
      if (newCategory.trim())
        category = String(
          (
            await api<{ id: number }>(
              "categories",
              {
                method: "POST",
                body: JSON.stringify({
                  category: { name: newCategory.trim() },
                }),
              },
              businessId,
            )
          ).data.id,
        );
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (
          key === "initial_quantity" ||
          (key === "purchase_price" && !canViewCosts)
        )
          continue;
        form.append(
          `product[${key}]`,
          key === "category_id"
            ? category
            : value ||
                ([
                  "selling_price",
                  "purchase_price",
                  "low_stock_threshold",
                ].includes(key)
                  ? "0"
                  : ""),
        );
      }
      if (image) form.append("product[image]", image);
      if (!product)
        form.append("initial_quantity", values.initial_quantity || "0");
      await api(
        product ? `products/${product.id}` : "products",
        { method: product ? "PATCH" : "POST", body: form },
        businessId,
      );
      toast.success(
        product
          ? tr("Product updated")
          : tr("A new product on your shelves ✨"),
      );
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="product-form">
      {barcode && (
        <p className="muted">
          {tr("New barcode:")} {barcode}{" "}
          {tr(". Add its details once; the next scan will find this item.")}
        </p>
      )}
      <div className="form-grid">
        <label>
          {tr("Size (optional)")}
          <input placeholder="M, XL, 32, 500 ml…" {...register("size")} />
        </label>
        <label>
          {tr("Colour (optional)")}
          <input placeholder={tr("Black, white…")} {...register("color")} />
        </label>
      </div>
      <label>
        {tr("Product name")}
        <span className="required">*</span>
        <input
          autoFocus
          placeholder={tr("e.g. Everyday oversized tee")}
          {...register("name")}
        />
        <small className="field-error">{tr(errors.name?.message || "")}</small>
      </label>
      <div className="form-grid">
        <label>
          {tr("Selling price")}
          <input
            inputMode="decimal"
            placeholder="0.00"
            {...register("selling_price")}
          />
          <small className="field-error">
            {tr(errors.selling_price?.message || "")}
          </small>
        </label>
        {!product && (
          <label>
            {tr("Opening stock")}
            <input
              inputMode="decimal"
              placeholder="0"
              {...register("initial_quantity")}
            />
            <small className="field-error">
              {tr(errors.initial_quantity?.message || "")}
            </small>
          </label>
        )}
      </div>
      <details open={!!barcode || !!product}>
        <summary>
          {tr("More options")}
          <ChevronDown size={17} />
        </summary>
        <div className="advanced-fields">
          <div className="form-grid">
            {canViewCosts && (
              <label>
                {tr("Purchase price")}
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register("purchase_price")}
                />
                <small className="field-error">
                  {tr(errors.purchase_price?.message || "")}
                </small>
              </label>
            )}
            <label>
              {tr("Low stock alert")}
              <input inputMode="decimal" {...register("low_stock_threshold")} />
              <small className="field-error">
                {tr(errors.low_stock_threshold?.message || "")}
              </small>
            </label>
          </div>
          <div className="form-grid">
            <label>
              {tr("SKU")}
              <input {...register("sku")} />
            </label>
            <label>
              {tr("Barcode")}
              <input {...register("barcode")} />
            </label>
          </div>
          <label>
            {tr("Category")}
            <select {...register("category_id")}>
              <option value="">{tr("No category")}</option>
              {cats.data?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr("Or create a category")}
            <input
              placeholder={tr("e.g. Clothing")}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </label>
          <label>
            {tr("Unit")}
            <select {...register("unit")}>
              <option value="units">{tr("units")}</option>
              <option value="pieces">{tr("pieces")}</option>
              <option value="kg">{tr("kg")}</option>
              <option value="g">{tr("g")}</option>
              <option value="litres">{tr("litres")}</option>
              <option value="metres">{tr("metres")}</option>
              <option value="boxes">{tr("boxes")}</option>
              <option value="pairs">{tr("pairs")}</option>
            </select>
          </label>
          <label>
            {tr("Description")}
            <textarea rows={3} {...register("description")} />
          </label>
          <label>
            {tr("Product image")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0])}
            />
            <small className="muted">
              {tr("JPG, PNG or WebP. Up to 5 MB.")}
            </small>
          </label>
        </div>
      </details>
      {error && (
        <p className="error-box" role="alert">
          {tr(error)}
        </p>
      )}
      <div className="form-sticky">
        <button className="button primary full" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Plus size={18} />
          )}{" "}
          {product ? tr("Save changes") : tr("Add product")}
        </button>
      </div>
    </form>
  );
}
export function StockForm({
  businessId,
  initialNote = "",
  canViewCosts = false,
  product,
  direction,
  onDone,
}: {
  businessId: number;
  initialNote?: string;
  canViewCosts?: boolean;
  product?: Product;
  direction: "in" | "out";
  onDone: () => void;
}) {
  const { tr, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Product | undefined>(product);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestKey] = useState(() => crypto.randomUUID());
  const query = useQuery({
    queryKey: ["stock-search", businessId, debounced],
    queryFn: () =>
      api<Product[]>(
        `products?q=${encodeURIComponent(debounced)}&per_page=20`,
        {},
        businessId,
      ),
    enabled: !selected,
  });
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!selected) return;
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const amount = Number(fd.get("quantity"));
          if (!Number.isFinite(amount) || amount <= 0)
            throw new Error(tr("Enter a quantity greater than zero"));
          await api(
            "stock_movements",
            {
              method: "POST",
              body: JSON.stringify({
                stock_movement: {
                  product_id: selected.id,
                  quantity: direction === "in" ? amount : -amount,
                  movement_type:
                    direction === "in" ? "stock_in" : fd.get("reason"),
                  ...(canViewCosts
                    ? { unit_cost: fd.get("unit_cost") || null }
                    : {}),
                  note: fd.get("note"),
                  idempotency_key: requestKey,
                },
              }),
            },
            businessId,
          );
          toast.success(
            tr(
              direction === "in"
                ? "{count} {unit} added. Stock updated."
                : "{count} {unit} removed. Stock updated.",
              { count: units(amount), unit: tr(selected.unit) },
            ),
          );
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="stock-form"
    >
      {selected ? (
        <div className="selected-product">
          <span>
            <strong>{selected.name}</strong>
            <small>
              {units(selected.current_stock)} {tr(selected.unit)}{" "}
              {tr("available")}
            </small>
          </span>
          {!product && (
            <button type="button" onClick={() => setSelected(undefined)}>
              {tr("Change")}
            </button>
          )}
        </div>
      ) : (
        <>
          <label>
            {tr("Find a product")}
            <input
              autoFocus
              placeholder={tr("Search your inventory")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="stock-product-options">
            {query.data?.data.map((p) => (
              <button type="button" key={p.id} onClick={() => setSelected(p)}>
                <span>{p.display_name || p.name}</span>
                <small>
                  {units(p.current_stock)} {tr(p.unit)}
                </small>
              </button>
            ))}
            {query.error && <p role="alert">{tr(query.error.message)}</p>}
            {query.data?.data.length === 0 && (
              <p className="muted">{tr("No products found.")}</p>
            )}
          </div>
        </>
      )}
      {selected && (
        <>
          <label>
            {tr("Quantity")}
            <input
              className="quantity-input"
              name="quantity"
              type="number"
              step="0.001"
              min="0.001"
              max={direction === "out" ? selected.current_stock : "99999999"}
              required
              placeholder="0"
              autoFocus
              inputMode="decimal"
            />
          </label>
          {direction === "out" ? (
            <label>
              {tr("Reason")}
              <select name="reason">
                <option value="sale">{tr("Sale")}</option>
                <option value="damage">{tr("Damage")}</option>
                <option value="adjustment">{tr("Adjustment")}</option>
                <option value="other">{tr("Other")}</option>
                <option value="return_out">{tr("Return to supplier")}</option>
              </select>
            </label>
          ) : canViewCosts ? (
            <label>
              {tr("Unit cost")}
              <span className="muted">{tr("optional")}</span>
              <input
                name="unit_cost"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
              />
            </label>
          ) : null}
          <label>
            {tr("Note")}
            <span className="muted">{tr("optional")}</span>
            <textarea
              name="note"
              defaultValue={initialNote}
              maxLength={1000}
              rows={3}
              placeholder={
                direction === "in"
                  ? tr("e.g. Monday supplier delivery")
                  : tr("e.g. Order #1024")
              }
            />
          </label>
          {error && (
            <p role="alert" className="error-box">
              {tr(error)}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy
              ? tr("Updating stock…")
              : direction === "in"
                ? tr("Add stock")
                : tr("Remove stock")}
            <ArrowUpRight size={18} />
          </button>
        </>
      )}
    </form>
  );
}
type ImportResult = {
  id: number;
  status: string;
  imported_count: number;
  row_errors: { row?: number; message: string }[];
};
export function ImportForm({
  businessId,
  onDone,
}: {
  businessId: number;
  onDone: () => void;
}) {
  const { tr, language } = useLanguage();
  const [id, setId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["import", businessId, id],
    queryFn: () => api<ImportResult>(`imports/${id}`, {}, businessId),
    enabled: !!id,
    refetchInterval: (q) =>
      ["completed", "failed"].includes(q.state.data?.data.status || "")
        ? false
        : 2000,
  });
  const status = query.data?.data.status;
  useEffect(() => {
    if (status === "completed") onDone();
  }, [status]);
  return (
    <div className="import-form">
      <p className="muted">
        {tr(
          "Bring your products from a CSV or Excel file. We’ll tell you which rows need a second look.",
        )}
      </p>
      <a className="button subtle full" href="/import-template.csv" download>
        <Download size={17} />
        {tr("Download the template")}
      </a>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const fd = new FormData(e.currentTarget);
            const r = await api<ImportResult>(
              "imports",
              { method: "POST", body: fd },
              businessId,
            );
            setId(r.data.id);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="upload-zone">
          <Upload size={30} />
          <strong>{tr("Choose your inventory file")}</strong>
          <span>{tr("CSV or XLSX · Up to 5 MB · 5,000 rows")}</span>
          <input name="file" type="file" accept=".csv,.xlsx" required />
        </label>
        <button
          className="button primary full"
          disabled={
            busy || (!!id && !["completed", "failed"].includes(status || ""))
          }
        >
          {busy ? tr("Uploading…") : tr("Import products")}
        </button>
      </form>
      {error && (
        <p role="alert" className="error-box">
          {tr(error)}
        </p>
      )}
      {query.data && (
        <div className="import-result">
          <h3>
            {status === "completed"
              ? tr("{count} products imported", {
                  count: query.data.data.imported_count,
                })
              : status === "failed"
                ? tr("This file needs another look")
                : tr("Making room on your shelves…")}
          </h3>
          {query.data.data.row_errors.map((e, i) => (
            <p key={i} className="error-box">
              {e.row ? tr("Row {row}: ", { row: e.row }) : ""}
              {tr(e.message)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
