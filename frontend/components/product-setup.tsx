"use client";
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
import { api, ApiError, money, units } from "@/lib/api";
import type { Business, Product } from "@/lib/types";
import {
  variantMatrix,
  type ProductGroup,
  type VariantDraft,
} from "@/lib/product-setup";
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
        Inventory
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ONE PRODUCT, EVERY OPTION</span>
          <h1>
            Sizes, colours & labels<span className="accent-period">.</span>
          </h1>
          <p>Keep your range together. Track every variant separately.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button subtle"
            onClick={() => setBrowseLabels(true)}
          >
            <Printer size={18} />
            Print labels
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
              Create product group
            </button>
          )}
        </div>
      </div>
      <label className="search-field setup-search">
        <Search size={18} />
        <input
          aria-label="Search product groups"
          placeholder="Search product groups"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {groups.isPending ? (
        <p>Loading your product groups…</p>
      ) : groups.error ? (
        <p role="alert" className="error-box">
          {groups.error.message}
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
              <span>{g.variant_count} variants</span>
              <span className="setup-card-link">
                View range <ChevronRight size={16} />
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="panel setup-empty">
          <Layers3 size={42} />
          <h2>
            {query ? "No matching groups" : "One tee. Every size and colour."}
          </h2>
          <p>
            {query
              ? "Try another product name."
              : "Create a range in one go, or group items already on your shelves."}
          </p>
          {canEdit && !query && (
            <button className="button primary" onClick={() => setCreate(true)}>
              <Plus size={18} />
              Create product group
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
          Previous
        </button>
        <span>{page}</span>
        <button
          className="button subtle"
          disabled={page >= (groups.data?.meta.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      {selected !== undefined && !create && (
        <Sheet
          open
          onClose={() => setSelected(undefined)}
          title={detail.data?.data.name || "Product group"}
        >
          {detail.isPending ? (
            <p>Loading variants…</p>
          ) : detail.error ? (
            <p role="alert">{detail.error.message}</p>
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
                    Print group labels
                  </button>
                  {canEdit && (
                    <button
                      className="button primary"
                      onClick={() => setCreate(true)}
                    >
                      <Plus size={17} />
                      Add variants
                    </button>
                  )}
                </div>
                <p className="muted">
                  Each size and colour has its own stock, price and barcode.
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
                          {money(p.selling_price, business.currency)}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
                {!detail.data.data.products?.length && (
                  <p>No active variants in this group.</p>
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
          title="Choose products for labels"
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
          "The last setup response was uncertain. Retry it to avoid creating duplicates.",
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
      toast.success("Your product range is ready");
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
      title={group ? `Add to ${group.name}` : "Create a product group"}
      description="Start with sizes and colours. Review the combinations before saving."
    >
      <div className="variant-form">
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        {pending ? (
          <div className="setup-pending">
            <p>Your previous setup is saved for a safe retry.</p>
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => save()}
            >
              {busy ? "Saving…" : "Retry setup"}
            </button>
          </div>
        ) : (
          <>
            <label>
              Product group name
              <input
                aria-label="Product group name"
                maxLength={200}
                value={name}
                disabled={!!group}
                placeholder="e.g. Classic Tee"
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
                New variants
              </button>
              <button
                aria-pressed={mode === "existing"}
                className={mode === "existing" ? "selected" : ""}
                onClick={() => setMode("existing")}
              >
                <Link2 size={17} />
                Existing products
              </button>
            </div>
            {mode === "existing" ? (
              <>
                <p className="muted">
                  Group existing items without changing their names, quantities
                  or histories. Each size/colour combination must be different.
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
                    Sizes
                    <input
                      aria-label="Sizes"
                      placeholder="S, M, L, XL"
                      value={sizes}
                      maxLength={1000}
                      onChange={(e) => setSizes(e.target.value)}
                    />
                    <small>Separate sizes with commas.</small>
                  </label>
                  <label>
                    Colours
                    <input
                      aria-label="Colours"
                      placeholder="Black, White"
                      value={colors}
                      maxLength={1000}
                      onChange={(e) => setColors(e.target.value)}
                    />
                    <small>Sizes or colours can be left empty.</small>
                  </label>
                  <label>
                    Selling price for each
                    <input
                      aria-label="Variant selling price"
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </label>
                  <label>
                    Opening stock for each
                    <input
                      aria-label="Variant opening stock"
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
                    ? "Rebuild combinations"
                    : "Preview combinations"}
                </button>
                {rows.length > 0 && (
                  <>
                    <p className="setup-preview-heading">
                      <strong>{rows.length} variants</strong>
                      <span>Adjust any row before saving.</span>
                    </p>
                    <p className="muted">
                      Blank barcodes get a unique internal code. Rebuilding
                      combinations replaces row edits.
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
                              aria-label={`Remove variant ${r.color} ${r.size}`}
                              onClick={() =>
                                setRows((all) => all.filter((_, n) => n !== i))
                              }
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="variant-row-fields">
                            <label>
                              Price
                              <input
                                aria-label={`Price ${r.color} ${r.size}`}
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
                              Opening stock
                              <input
                                aria-label={`Opening stock ${r.color} ${r.size}`}
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
                            <summary>Barcode, SKU & cost</summary>
                            <label>
                              Barcode
                              <input
                                maxLength={100}
                                value={r.barcode}
                                placeholder="Generate automatically"
                                onChange={(e) =>
                                  edit(i, "barcode", e.target.value)
                                }
                              />
                            </label>
                            <label>
                              SKU
                              <input
                                maxLength={100}
                                value={r.sku}
                                onChange={(e) => edit(i, "sku", e.target.value)}
                              />
                            </label>
                            <label>
                              Purchase price
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
                      Create {rows.length} variants
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
          aria-label="Search products to select"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <p aria-live="polite">{picked.length} selected · up to 100</p>
      {products.isPending ? (
        <p>Loading products…</p>
      ) : products.error ? (
        <p role="alert">{products.error.message}</p>
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
        <p>No matching products.</p>
      )}
      <div className="checkout-pagination">
        <button
          className="button subtle"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>{page}</span>
        <button
          className="button subtle"
          disabled={page >= (products.data?.meta.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
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
