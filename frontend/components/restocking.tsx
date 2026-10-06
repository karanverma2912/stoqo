"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, PackagePlus, Pencil } from "lucide-react";
import { api, units } from "@/lib/api";
import type { Business, Product } from "@/lib/types";
import { useLanguage } from "./language-provider";
import { Sheet } from "./ui/sheet";
import { StockForm } from "./workspace-forms";
type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  notes: string;
  archived: boolean;
};
export function Restocking({ business }: { business: Business }) {
  const { tr } = useLanguage(),
    client = useQueryClient();
  const [page, setPage] = useState(1),
    [supplierPage, setSupplierPage] = useState(1),
    [supplierId, setSupplierId] = useState("");
  const [allProducts, setAllProducts] = useState(false),
    [search, setSearch] = useState(""),
    [supplierSearch, setSupplierSearch] = useState("");
  const [archived, setArchived] = useState(false),
    [editing, setEditing] = useState<Supplier | "new">(),
    [receiving, setReceiving] = useState<Product>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const permitted = ["owner", "admin", "manager"].includes(business.role || "");
  const suppliers = useQuery({
    queryKey: [
      "suppliers",
      business.id,
      supplierPage,
      supplierSearch,
      archived,
    ],
    queryFn: () =>
      api<Supplier[]>(
        `suppliers?${new URLSearchParams({ per_page: "100", page: String(supplierPage), q: supplierSearch, archived: String(archived) })}`,
        {},
        business.id,
      ),
    enabled: permitted,
  });
  const products = useQuery({
    queryKey: ["restock", business.id, page, supplierId, allProducts, search],
    queryFn: () =>
      api<Product[]>(
        `products?${new URLSearchParams({ filter: allProducts ? "" : "restock", page: String(page), supplier_id: supplierId, q: search, sort: "stock" })}`,
        {},
        business.id,
      ),
    enabled: permitted,
  });
  async function refresh() {
    await client.invalidateQueries();
  }
  async function assign(product: Product, value: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `products/${product.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ product: { supplier_id: value || null } }),
        },
        business.id,
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!permitted)
    return (
      <p role="alert">
        {tr("Only owners, admins and managers can manage suppliers.")}
      </p>
    );
  return (
    <div className="restock-page">
      <div className="page-heading">
        <div>
          <h1>{tr("Suppliers & restocking")}</h1>
          <p>
            {tr(
              "See what needs topping up and record deliveries in a few taps.",
            )}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setError("");
            setEditing("new");
          }}
        >
          <Plus size={18} />
          {tr("Add supplier")}
        </button>
      </div>
      {error && (
        <p className="error-box" role="alert">
          {tr(error)}
        </p>
      )}
      <section className="panel report-panel">
        <h2>{tr("Your suppliers")}</h2>
        <div className="date-filters">
          <label>
            {tr("Search suppliers")}
            <input
              value={supplierSearch}
              onChange={(e) => {
                setSupplierSearch(e.target.value);
                setSupplierPage(1);
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setSupplierPage(1);
              }}
            />
            {tr("Show archived suppliers")}
          </label>
        </div>
        {suppliers.isPending ? (
          <p>{tr("Loading…")}</p>
        ) : suppliers.error ? (
          <p role="alert">{tr(suppliers.error.message)}</p>
        ) : (
          <>
            <div className="daily-employees">
              {suppliers.data.data.map((s) => (
                <article className="daily-employee" key={s.id}>
                  <strong>{s.name}</strong>
                  <p>{s.contact_name}</p>
                  <p>{s.phone}</p>
                  <p>{s.email}</p>
                  <p>{s.notes}</p>
                  <button
                    className="button subtle"
                    onClick={() => {
                      setError("");
                      setEditing(s);
                    }}
                  >
                    <Pencil size={16} />
                    {tr("Edit supplier")}
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => {
                      setSupplierId(String(s.id));
                      setPage(1);
                    }}
                  >
                    {tr("View products")}
                  </button>
                </article>
              ))}
            </div>
            {!suppliers.data.data.length && (
              <p>
                {tr(
                  "No suppliers here yet. Add one to organize your restocking.",
                )}
              </p>
            )}
            <div className="daily-pager">
              <button
                className="button subtle"
                disabled={supplierPage <= 1}
                onClick={() => setSupplierPage((p) => p - 1)}
              >
                {tr("Previous")}
              </button>
              <span>{supplierPage}</span>
              <button
                className="button subtle"
                disabled={supplierPage >= suppliers.data.meta.pages}
                onClick={() => setSupplierPage((p) => p + 1)}
              >
                {tr("Next")}
              </button>
            </div>
          </>
        )}
      </section>
      <section className="panel report-panel">
        <h2>{tr("Restock list")}</h2>
        <p className="muted">
          {tr(
            "Includes products at or below their low-stock alert. Receive the quantity actually delivered; this list is not a purchase order.",
          )}
        </p>
        <div className="date-filters">
          <label>
            {tr("Search products")}
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={allProducts}
              onChange={(e) => {
                setAllProducts(e.target.checked);
                setPage(1);
              }}
            />
            {tr("Show all products to link suppliers")}
          </label>
          {supplierId && (
            <button
              className="button subtle"
              onClick={() => {
                setSupplierId("");
                setPage(1);
              }}
            >
              {tr("Clear supplier filter")}
            </button>
          )}
        </div>
        {products.isPending ? (
          <p>{tr("Loading…")}</p>
        ) : products.error ? (
          <p role="alert">{tr(products.error.message)}</p>
        ) : (
          <>
            <div className="daily-employees">
              {products.data.data.map((p) => (
                <article className="daily-employee" key={p.id}>
                  <strong>{p.display_name || p.name}</strong>
                  <p>
                    {tr("Current stock")}: {units(p.current_stock)} {tr(p.unit)}
                  </p>
                  <p>
                    {tr("Low stock alert")}: {units(p.low_stock_threshold)}
                  </p>
                  <label>
                    {tr("Supplier")}
                    <select
                      aria-label={`${tr("Supplier")} ${p.name}`}
                      disabled={busy}
                      value={p.supplier_id || ""}
                      onChange={(e) => assign(p, e.target.value)}
                    >
                      <option value="">{tr("No supplier")}</option>
                      {p.supplier_id &&
                        !suppliers.data?.data.some(
                          (s) => s.id === p.supplier_id,
                        ) && (
                          <option value={p.supplier_id}>
                            {p.supplier_name}
                          </option>
                        )}
                      {suppliers.data?.data.map((s) => (
                        <option disabled={s.archived} key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button primary"
                    onClick={() => setReceiving(p)}
                  >
                    <PackagePlus size={17} />
                    {tr("Receive stock")}
                  </button>
                </article>
              ))}
            </div>
            {!products.data.data.length && (
              <p>{tr("Everything in this selection is stocked.")}</p>
            )}
            <div className="daily-pager">
              <button
                className="button subtle"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {tr("Previous")}
              </button>
              <span>{page}</span>
              <button
                className="button subtle"
                disabled={page >= products.data.meta.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tr("Next")}
              </button>
            </div>
          </>
        )}
      </section>
      <Sheet
        open={editing !== undefined}
        onClose={() => {
          if (!busy) setEditing(undefined);
        }}
        title={tr(editing === "new" ? "Add supplier" : "Edit supplier")}
      >
        {editing && (
          <form
            key={editing === "new" ? "new" : editing.id}
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              const fields = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              try {
                await api(
                  editing === "new" ? "suppliers" : `suppliers/${editing.id}`,
                  {
                    method: editing === "new" ? "POST" : "PATCH",
                    body: JSON.stringify({
                      supplier: {
                        ...fields,
                        archived: fields.archived === "on",
                      },
                    }),
                  },
                  business.id,
                );
                setEditing(undefined);
                await refresh();
                toast.success(tr("Supplier saved"));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {(
              [
                ["name", "Supplier name", 120],
                ["contact_name", "Contact person", 120],
                ["phone", "Phone", 30],
                ["email", "Email", 254],
                ["notes", "Notes", 2000],
              ] as const
            ).map(([field, label, limit]) => (
              <label key={field}>
                {tr(label)}
                <input
                  name={field}
                  required={field === "name"}
                  maxLength={limit}
                  type={
                    field === "email"
                      ? "email"
                      : field === "phone"
                        ? "tel"
                        : "text"
                  }
                  defaultValue={editing === "new" ? "" : editing[field]}
                />
              </label>
            ))}
            {editing !== "new" && (
              <label>
                <input
                  type="checkbox"
                  name="archived"
                  defaultChecked={editing.archived}
                />
                {tr("Archive supplier")}
              </label>
            )}
            <p className="muted">
              {tr(
                "Archiving keeps existing product links and hides the supplier from new selections.",
              )}
            </p>
            {error && (
              <p className="error-box" role="alert">
                {tr(error)}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {tr(busy ? "Saving…" : "Save supplier")}
            </button>
          </form>
        )}
      </Sheet>
      <Sheet
        open={!!receiving}
        onClose={() => setReceiving(undefined)}
        title={tr("Receive stock")}
      >
        {receiving && (
          <StockForm
            key={receiving.id}
            product={receiving}
            businessId={business.id}
            direction="in"
            canViewCosts={["owner", "admin"].includes(business.role || "")}
            initialNote={
              receiving.supplier_name
                ? `${tr("Supplier")}: ${receiving.supplier_name}`
                : ""
            }
            onDone={() => {
              setReceiving(undefined);
              void refresh();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
