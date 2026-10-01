"use client";

import { useLanguage } from "@/components/language-provider";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers3,
  Plus,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Link2,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, units } from "@/lib/api";
import type { Business, Product } from "@/lib/types";
import {
  variantMatrix,
  type ProductGroup,
  type VariantDraft,
} from "@/lib/product-setup";
import { billMoney } from "@/lib/sales";
import { Sheet } from "./ui/sheet";
const Labels = dynamic(() => import("./barcode-labels"), { ssr: false });
type SetupPayload = {
  name: string;
  idempotency_key: string;
  variants?: VariantDraft[];
  product_ids?: number[];
};
export function ProductSetup({
  business,
  userId,
}: {
  business: Business;
  userId: number;
}) {
  const { tr, language } = useLanguage();
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<number>(),
    [create, setCreate] = useState(false),
    [labels, setLabels] = useState<Product[]>(),
    [browseLabels, setBrowseLabels] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);
  const groups = useQuery({
    queryKey: ["product-groups", business.id, query, page],
    queryFn: () =>
      api<ProductGroup[]>(
        `product_groups?q=${encodeURIComponent(query)}&page=${page}`,
        {},
        business.id,
      ),
  });
  const detail = useQuery({
    queryKey: ["product-group", business.id, selected],
    queryFn: () =>
      api<ProductGroup>(`product_groups/${selected}`, {}, business.id),
    enabled: selected !== undefined,
  });
  const canEdit = business.role !== "staff";
  return (
    <div className="product-setup">
      <Link className="text-link" href="/app/inventory">
        <ChevronLeft size={16} />
        {tr("Inventory")}
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("ONE PRODUCT, EVERY OPTION")}</span>
          <h1>
            {tr("Sizes, colours & labels")}
            <span className="accent-period">.</span>
          </h1>
          <p>
            {tr("Keep your range together. Track every variant separately.")}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button subtle"
            onClick={() => setBrowseLabels(true)}
          >
            <Printer size={18} />
            {tr("Print labels")}
          </button>
          {canEdit && (
            <button
              className="button primary"
              onClick={() => {
                setSelected(undefined);
                setCreate(true);
              }}
            >
              <Plus size={18} />
              {tr("Create product group")}
            </button>
          )}
        </div>
      </div>
      <label className="search-field setup-search">
        <Search size={18} />
        <input
          aria-label={tr("Search product groups")}
          placeholder={tr("Search product groups")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {groups.isPending ? (
        <p>{tr("Loading your product groups…")}</p>
      ) : groups.error ? (
        <p role="alert" className="error-box">
          {tr(groups.error.message)}
        </p>
      ) : groups.data.data.length ? (
        <div className="setup-group-grid">
          {groups.data.data.map((g) => (
            <motion.button
              whileTap={{ scale: 0.98 }}
              key={g.id}
              className="setup-group-card"
              onClick={() => setSelected(g.id)}
            >
              <span className="setup-group-icon">
                <Layers3 size={24} />
              </span>
              <strong>{g.name}</strong>
              <span>
                {g.variant_count} {tr("variants")}
              </span>
              <span className="setup-card-link">
                {tr("View range")}
                <ChevronRight size={16} />
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="panel setup-empty">
          <Layers3 size={42} />
          <h2>
            {query
              ? tr("No matching groups")
              : tr("One tee. Every size and colour.")}
          </h2>
          <p>
            {query
              ? tr("Try another product name.")
              : tr(
                  "Create a range in one go, or group items already on your shelves.",
                )}
          </p>
          {canEdit && !query && (
            <button className="button primary" onClick={() => setCreate(true)}>
              <Plus size={18} />
              {tr("Create product group")}
            </button>
          )}
        </div>
      )}
      <div className="checkout-pagination">
        <button
          className="button subtle"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {tr("Previous")}
        </button>
        <span>{page}</span>
        <button
          className="button subtle"
          disabled={page >= (groups.data?.meta.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          {tr("Next")}
        </button>
      </div>
      {selected !== undefined && !create && (
        <Sheet
          open
          onClose={() => setSelected(undefined)}
          title={detail.data?.data.name || "Product group"}
        >
          {detail.isPending ? (
            <p>{tr("Loading variants…")}</p>
          ) : detail.error ? (
            <p role="alert">{tr(detail.error.message)}</p>
          ) : (
            detail.data && (
              <>
                <div className="setup-detail-actions">
                  <button
                    className="button subtle"
                    disabled={!detail.data.data.products?.length}
                    onClick={() => setLabels(detail.data!.data.products)}
                  >
                    <Printer size={17} />
                    {tr("Print group labels")}
                  </button>
                  {canEdit && (
                    <button
                      className="button primary"
                      onClick={() => setCreate(true)}
                    >
                      <Plus size={17} />
                      {tr("Add variants")}
                    </button>
                  )}
                </div>
                <p className="muted">
                  {tr(
                    "Each size and colour has its own stock, price and barcode.",
                  )}
                </p>
                <div className="setup-variant-list">
                  {detail.data.data.products?.map((p) => (
                    <div key={p.id}>
                      <span>
                        <strong>
                          {[p.color, p.size].filter(Boolean).join(" / ") ||
                            p.name}
                        </strong>
                        <small>
                          {p.barcode || "No barcode"}
                          {p.sku ? ` · ${p.sku}` : ""}
                        </small>
                      </span>
                      <span>
                        <strong>
                          {units(p.current_stock)} {p.unit}
                        </strong>
                        <small>
                          {billMoney(p.selling_price, business.currency)}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
                {!detail.data.data.products?.length && (
                  <p>{tr("No active variants in this group.")}</p>
                )}
              </>
            )
          )}
        </Sheet>
      )}
      {create && (
        <VariantForm
          key={selected || "new"}
          business={business}
          userId={userId}
          group={selected ? detail.data?.data : undefined}
          onClose={() => setCreate(false)}
          onDone={(g) => {
            setCreate(false);
            setSelected(g.id);
          }}
        />
      )}
      {browseLabels && (
        <Sheet
          open
          onClose={() => setBrowseLabels(false)}
          title={tr("Choose products for labels")}
        >
          <ProductPicker
            businessId={business.id}
            onDone={(ps) => {
              setBrowseLabels(false);
              setLabels(ps);
            }}
            buttonText="Prepare labels"
          />
        </Sheet>
      )}
      {labels && (
        <Labels
          products={labels}
          business={business}
          onClose={() => setLabels(undefined)}
        />
      )}
    </div>
  );
}
function VariantForm({
  business,
  userId,
  group,
  onClose,
  onDone,
}: {
  business: Business;
  userId: number;
  group?: ProductGroup;
  onClose: () => void;
  onDone: (g: ProductGroup) => void;
}) {
  const { tr, language } = useLanguage();
  const [mode, setMode] = useState<"new" | "existing">("new"),
    [name, setName] = useState(group?.name || ""),
    [sizes, setSizes] = useState(""),
    [colors, setColors] = useState(""),
    [price, setPrice] = useState(""),
    [quantity, setQuantity] = useState("0"),
    [rows, setRows] = useState<VariantDraft[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<SetupPayload>();
  const lock = useRef(false),
    client = useQueryClient(),
    key = `stoqo-product-setup:${userId}:${business.id}:${group?.id || "new"}`;
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        setPending(JSON.parse(saved));
        setError(
          tr(
            "The last setup response was uncertain. Retry it to avoid creating duplicates.",
          ),
        );
      }
    } catch {}
  }, [key]);
  async function save(products?: Product[]) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const payload = pending || {
      name: name.trim(),
      idempotency_key: crypto.randomUUID(),
      ...(products
        ? { product_ids: products.map((p) => p.id) }
        : { variants: rows }),
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
      setPending(payload);
      const result = await api<ProductGroup>(
        group ? `product_groups/${group.id}/add_variants` : "product_groups",
        { method: "POST", body: JSON.stringify({ product_group: payload }) },
        business.id,
      );
      sessionStorage.removeItem(key);
      setPending(undefined);
      await client.invalidateQueries();
      toast.success(tr("Your product range is ready"));
      onDone(result.data);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status < 500) {
        sessionStorage.removeItem(key);
        setPending(undefined);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function preview() {
    try {
      setRows(variantMatrix(sizes, colors, price, quantity));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function edit(index: number, field: keyof VariantDraft, value: string) {
    setRows((all) =>
      all.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }
  return (
    <Sheet
      open
      onClose={() => {
        if (!busy && !pending) onClose();
      }}
      title={
        group
          ? tr("Add to {name}", { name: group.name })
          : tr("Create a product group")
      }
      description={tr(
        "Start with sizes and colours. Review the combinations before saving.",
      )}
    >
      <div className="variant-form">
        {error && (
          <p role="alert" className="error-box">
            {tr(error)}
          </p>
        )}
        {pending ? (
          <div className="setup-pending">
            <p>{tr("Your previous setup is saved for a safe retry.")}</p>
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => save()}
            >
              {busy ? tr("Saving…") : tr("Retry setup")}
            </button>
          </div>
        ) : (
          <>
            <label>
              {tr("Product group name")}
              <input
                aria-label={tr("Product group name")}
                maxLength={200}
                value={name}
                disabled={!!group}
                placeholder={tr("e.g. Classic Tee")}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="checkout-tabs">
              <button
                aria-pressed={mode === "new"}
                className={mode === "new" ? "selected" : ""}
                onClick={() => setMode("new")}
              >
                <Plus size={17} />
                {tr("New variants")}
              </button>
              <button
                aria-pressed={mode === "existing"}
                className={mode === "existing" ? "selected" : ""}
                onClick={() => setMode("existing")}
              >
                <Link2 size={17} />
                {tr("Existing products")}
              </button>
            </div>
            {mode === "existing" ? (
              <>
                <p className="muted">
                  {tr(
                    "Group existing items without changing their names, quantities or histories. Each size/colour combination must be different.",
                  )}
                </p>
                <ProductPicker
                  businessId={business.id}
                  ungrouped
                  disabled={!name.trim() || busy}
                  onDone={save}
                  buttonText="Group selected products"
                />
              </>
            ) : (
              <>
                <div className="variant-options">
                  <label>
                    {tr("Sizes")}
                    <input
                      aria-label={tr("Sizes")}
                      placeholder="S, M, L, XL"
                      value={sizes}
                      maxLength={1000}
                      onChange={(e) => setSizes(e.target.value)}
                    />
                    <small>{tr("Separate sizes with commas.")}</small>
                  </label>
                  <label>
                    {tr("Colours")}
                    <input
                      aria-label={tr("Colours")}
                      placeholder={tr("Black, White")}
                      value={colors}
                      maxLength={1000}
                      onChange={(e) => setColors(e.target.value)}
                    />
                    <small>{tr("Sizes or colours can be left empty.")}</small>
                  </label>
                  <label>
                    {tr("Selling price for each")}
                    <input
                      aria-label={tr("Variant selling price")}
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </label>
                  <label>
                    {tr("Opening stock for each")}
                    <input
                      aria-label={tr("Variant opening stock")}
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.001"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="button subtle full"
                  onClick={preview}
                  disabled={!name.trim()}
                >
                  {rows.length
                    ? tr("Rebuild combinations")
                    : tr("Preview combinations")}
                </button>
                {rows.length > 0 && (
                  <>
                    <p className="setup-preview-heading">
                      <strong>
                        {rows.length} {tr("variants")}
                      </strong>
                      <span>{tr("Adjust any row before saving.")}</span>
                    </p>
                    <p className="muted">
                      {tr(
                        "Blank barcodes get a unique internal code. Rebuilding combinations replaces row edits.",
                      )}
                    </p>
                    <AnimatePresence initial={false}>
                      {rows.map((r, i) => (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="variant-draft"
                          key={`${r.color}/${r.size}`}
                        >
                          <div className="variant-draft-title">
                            <strong>
                              {[r.color, r.size].filter(Boolean).join(" / ")}
                            </strong>
                            <button
                              className="icon-button"
                              aria-label={tr("Remove variant {color} {size}", {
                                color: r.color,
                                size: r.size,
                              })}
                              onClick={() =>
                                setRows((all) => all.filter((_, n) => n !== i))
                              }
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="variant-row-fields">
                            <label>
                              {tr("Price")}
                              <input
                                aria-label={tr("Price {color} {size}", {
                                  color: r.color,
                                  size: r.size,
                                })}
                                type="number"
                                min="0"
                                step="0.01"
                                value={r.selling_price}
                                onChange={(e) =>
                                  edit(i, "selling_price", e.target.value)
                                }
                              />
                            </label>
                            <label>
                              {tr("Opening stock")}
                              <input
                                aria-label={tr("Opening stock {color} {size}", {
                                  color: r.color,
                                  size: r.size,
                                })}
                                type="number"
                                min="0"
                                step="0.001"
                                value={r.initial_quantity}
                                onChange={(e) =>
                                  edit(i, "initial_quantity", e.target.value)
                                }
                              />
                            </label>
                          </div>
                          <details>
                            <summary>{tr("Barcode, SKU & cost")}</summary>
                            <label>
                              {tr("Barcode")}
                              <input
                                maxLength={100}
                                value={r.barcode}
                                placeholder={tr("Generate automatically")}
                                onChange={(e) =>
                                  edit(i, "barcode", e.target.value)
                                }
                              />
                            </label>
                            <label>
                              {tr("SKU")}
                              <input
                                maxLength={100}
                                value={r.sku}
                                onChange={(e) => edit(i, "sku", e.target.value)}
                              />
                            </label>
                            <label>
                              {tr("Purchase price")}
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={r.purchase_price}
                                onChange={(e) =>
                                  edit(i, "purchase_price", e.target.value)
                                }
                              />
                            </label>
                          </details>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <button
                      className="button primary full"
                      disabled={!name.trim() || busy}
                      onClick={() => save()}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={18} />
                      ) : (
                        <Check size={18} />
                      )}
                      {tr("Create")} {rows.length} {tr("variants")}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
function ProductPicker({
  businessId,
  ungrouped = false,
  disabled = false,
  onDone,
  buttonText,
}: {
  businessId: number;
  ungrouped?: boolean;
  disabled?: boolean;
  onDone: (ps: Product[]) => void;
  buttonText: string;
}) {
  const { tr, language } = useLanguage();
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [picked, setPicked] = useState<Product[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);
  const products = useQuery({
    queryKey: ["setup-picker", businessId, query, page, ungrouped],
    queryFn: () =>
      api<Product[]>(
        `products?q=${encodeURIComponent(query)}&page=${page}&ungrouped=${ungrouped}`,
        {},
        businessId,
      ),
  });
  return (
    <div className="setup-picker">
      <label className="search-field">
        <Search size={18} />
        <input
          aria-label={tr("Search products to select")}
          placeholder={tr("Search products")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <p aria-live="polite">
        {picked.length} {tr("selected · up to 100")}
      </p>
      {products.isPending ? (
        <p>{tr("Loading products…")}</p>
      ) : products.error ? (
        <p role="alert">{tr(products.error.message)}</p>
      ) : products.data.data.length ? (
        products.data.data.map((p) => (
          <label className="setup-picker-row" key={p.id}>
            <input
              type="checkbox"
              disabled={
                disabled ||
                (picked.length >= 100 && !picked.some((x) => x.id === p.id))
              }
              checked={picked.some((x) => x.id === p.id)}
              onChange={(e) =>
                setPicked((all) =>
                  e.target.checked
                    ? [...all, p]
                    : all.filter((x) => x.id !== p.id),
                )
              }
            />
            <span>
              <strong>{p.display_name || p.name}</strong>
              <small>
                {p.barcode || "No barcode"} · {units(p.current_stock)} {p.unit}
              </small>
            </span>
          </label>
        ))
      ) : (
        <p>{tr("No matching products.")}</p>
      )}
      <div className="checkout-pagination">
        <button
          className="button subtle"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {tr("Previous")}
        </button>
        <span>{page}</span>
        <button
          className="button subtle"
          disabled={page >= (products.data?.meta.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          {tr("Next")}
        </button>
      </div>
      <button
        className="button primary full"
        disabled={disabled || !picked.length}
        onClick={() => onDone(picked)}
      >
        {buttonText} ({picked.length})
      </button>
    </div>
  );
}
