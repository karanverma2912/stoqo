"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ReceiptText,
  ArrowRight,
  Printer,
  Share2,
  RotateCcw,
  Search,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, units } from "@/lib/api";
import type { Product, Business } from "@/lib/types";
import { billMoney, lineCents, type Sale } from "@/lib/sales";
import { useLanguage } from "./language-provider";
import { checkoutCopy, type CheckoutLanguage } from "@/lib/checkout-copy";
import { Sheet } from "./ui/sheet";
import { ProductForm } from "./workspace-forms";
const Scanner = dynamic(() => import("./scanner"), { ssr: false });
type Line = { product: Product; quantity: string; price: string };
type Payload = {
  idempotency_key: string;
  items: { product_id: number; quantity: string; unit_price: string }[];
  discount: string;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
};
export function Checkout({
  business,
  userId,
}: {
  business: Business;
  userId: number;
}) {
  const { tr, language: lang } = useLanguage();
  const [tab, setTab] = useState<"checkout" | "history">("checkout"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [cart, setCart] = useState<Line[]>([]),
    [scan, setScan] = useState(false),
    [barcode, setBarcode] = useState<string>(),
    [receipt, setReceipt] = useState<Sale>(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<Payload>(),
    [discount, setDiscount] = useState(""),
    [customer, setCustomer] = useState(""),
    [phone, setPhone] = useState(""),
    [payment, setPayment] = useState("cash"),
    [error, setError] = useState("");
  const client = useQueryClient(),
    lock = useRef(false),
    barcodeInput = useRef<HTMLInputElement>(null),
    t = checkoutCopy[lang],
    manager = business.role !== "staff",
    pendingKey = `stoqo-checkout-pending:${userId}:${business.id}`;
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(pendingKey);
      if (p) {
        setPending(JSON.parse(p));
        setError(checkoutCopy.en.pending);
      }
    } catch {}
  }, [pendingKey]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const products = useQuery({
    queryKey: ["checkout-products", business.id, query],
    queryFn: () =>
      api<Product[]>(
        `products?q=${encodeURIComponent(query)}&per_page=20`,
        {},
        business.id,
      ),
  });
  const subtotal = cart.reduce(
      (sum, l) => sum + lineCents(l.quantity, l.price),
      0,
    ),
    discountCents = lineCents("1", discount || "0"),
    total = subtotal - discountCents;
  const valid =
    cart.length > 0 &&
    cart.every(
      (l) =>
        Number(l.quantity) > 0 &&
        Number(l.quantity) <= Number(l.product.current_stock) &&
        Number.isFinite(lineCents(l.quantity, l.price)),
    ) &&
    Number.isFinite(total) &&
    total >= 0;
  function add(p: Product) {
    if (pending || busy) return;
    const current = cart.find((l) => l.product.id === p.id);
    if (
      (current ? Number(current.quantity) + 1 : 0) > Number(p.current_stock) ||
      Number(p.current_stock) <= 0
    ) {
      toast.error(t.maxStock);
      return;
    }
    setCart((rows) => {
      const found = rows.find((l) => l.product.id === p.id);
      return found
        ? rows.map((l) =>
            l.product.id === p.id
              ? { ...l, quantity: String(Number(l.quantity) + 1) }
              : l,
          )
        : [
            ...rows,
            {
              product: p,
              quantity: String(Math.min(1, Number(p.current_stock))),
              price: Number(p.selling_price).toFixed(2),
            },
          ];
    });
    toast.success(p.display_name || p.name, { duration: 1000 });
  }
  async function lookup(code: string) {
    const r = await api<Product[]>(
      `products?barcode=${encodeURIComponent(code.trim())}`,
      {},
      business.id,
    );
    if (r.data[0]) add(r.data[0]);
    else {
      setScan(false);
      setBarcode(code.trim());
    }
    barcodeInput.current?.focus();
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const payload = pending || {
      idempotency_key: crypto.randomUUID(),
      items: cart.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
        unit_price: l.price,
      })),
      discount: discount || "0",
      customer_name: customer,
      customer_phone: phone,
      payment_method: payment,
    };
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(payload));
      setPending(payload);
      const result = await api<Sale>(
        "sales",
        { method: "POST", body: JSON.stringify({ sale: payload }) },
        business.id,
      );
      sessionStorage.removeItem(pendingKey);
      setPending(undefined);
      setReceipt(result.data);
      setCart([]);
      setDiscount("");
      setCustomer("");
      setPhone("");
      setConfirm(false);
      await client.invalidateQueries();
      toast.success(t.saved);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        sessionStorage.removeItem(pendingKey);
        setPending(undefined);
        setConfirm(false);
        await client.invalidateQueries({
          queryKey: ["checkout-products", business.id],
        });
      } else setError(t.pending);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="checkout-page" lang={lang}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("STOQO COUNTER")}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </div>
      <div className="checkout-tabs" role="tablist" aria-label={t.checkout}>
        <button
          role="tab"
          aria-selected={tab === "checkout"}
          className={tab === "checkout" ? "selected" : ""}
          onClick={() => setTab("checkout")}
        >
          <ShoppingBag size={18} />
          {t.checkout}
          {cart.length > 0 && <span>{cart.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={tab === "history"}
          className={tab === "history" ? "selected" : ""}
          onClick={() => setTab("history")}
        >
          <ReceiptText size={18} />
          {t.history}
        </button>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {tr(error)}
          {pending && (
            <button className="button primary" disabled={busy} onClick={save}>
              {t.retry}
            </button>
          )}
        </div>
      )}
      {tab === "history" ? (
        <BillHistory business={business} lang={lang} onSelect={setReceipt} />
      ) : (
        <div className="checkout-grid">
          <section className="checkout-catalog panel">
            <div className="checkout-search">
              <Search size={19} />
              <input
                aria-label={t.search}
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="checkout-scan-row">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  const code = new FormData(f)
                    .get("barcode")
                    ?.toString()
                    .trim();
                  if (!code) return;
                  try {
                    await lookup(code);
                    f.reset();
                  } catch (e) {
                    toast.error(tr((e as Error).message));
                  }
                }}
              >
                <input
                  ref={barcodeInput}
                  name="barcode"
                  aria-label={t.enter}
                  placeholder={t.enter}
                  autoComplete="off"
                  disabled={busy || !!pending}
                />
                <button
                  className="button subtle"
                  disabled={busy || !!pending}
                  aria-label={t.find}
                >
                  <Plus size={20} />
                </button>
              </form>
              <button
                className="button primary"
                disabled={busy || !!pending}
                onClick={() => setScan(true)}
              >
                <ScanLine size={19} />
                {t.scan}
              </button>
            </div>
            {products.isPending ? (
              <p className="muted">{t.loading}</p>
            ) : products.error ? (
              <p className="error-box">{tr(products.error.message)}</p>
            ) : (
              <div className="checkout-product-grid">
                {products.data.data.map((p) => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.97 }}
                    className="checkout-product"
                    disabled={+p.current_stock <= 0 || busy || !!pending}
                    onClick={() => add(p)}
                  >
                    <span className="checkout-product-icon">
                      {(p.display_name || p.name).slice(0, 1).toUpperCase()}
                    </span>
                    <strong>{p.display_name || p.name}</strong>
                    <span className="muted">
                      {units(p.current_stock)} {p.unit} · {t.remaining}
                    </span>
                    <span className="checkout-product-price">
                      {billMoney(p.selling_price, business.currency, lang)}
                      <Plus size={16} />
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
            <button
              className="button subtle"
              disabled={busy || !!pending}
              onClick={() => setBarcode("")}
            >
              <Plus size={18} />
              {t.addProduct}
            </button>
          </section>
          <section className="checkout-cart panel">
            <div className="checkout-cart-heading">
              <h2>{t.cart}</h2>
              <button
                className="icon-button"
                aria-label={t.clear}
                disabled={!cart.length || busy || !!pending}
                onClick={() => {
                  if (window.confirm(t.clearConfirm)) {
                    setCart([]);
                    setDiscount("");
                  }
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="checkout-lines">
              <AnimatePresence initial={false}>
                {cart.length ? (
                  cart.map((l) => (
                    <motion.div
                      key={l.product.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="checkout-line"
                    >
                      <div className="checkout-line-top">
                        <strong>
                          {l.product.display_name || l.product.name}
                        </strong>
                        <button
                          aria-label={`${t.remove} ${l.product.name}`}
                          disabled={busy || !!pending}
                          onClick={() =>
                            setCart((rows) =>
                              rows.filter((r) => r.product.id !== l.product.id),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="checkout-line-controls">
                        <div className="quantity-control">
                          <button
                            aria-label={`${t.quantity} − ${l.product.name}`}
                            disabled={busy || !!pending || +l.quantity <= 1}
                            onClick={() =>
                              setCart((rows) =>
                                rows.map((r) =>
                                  r === l
                                    ? {
                                        ...r,
                                        quantity: String(+r.quantity - 1),
                                      }
                                    : r,
                                ),
                              )
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            aria-label={`${t.quantity} ${l.product.name}`}
                            inputMode="decimal"
                            value={l.quantity}
                            disabled={busy || !!pending}
                            onChange={(e) =>
                              setCart((rows) =>
                                rows.map((r) =>
                                  r === l
                                    ? { ...r, quantity: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <button
                            aria-label={`${t.quantity} + ${l.product.name}`}
                            disabled={
                              busy ||
                              !!pending ||
                              +l.quantity >= +l.product.current_stock
                            }
                            onClick={() =>
                              setCart((rows) =>
                                rows.map((r) =>
                                  r === l
                                    ? {
                                        ...r,
                                        quantity: String(+r.quantity + 1),
                                      }
                                    : r,
                                ),
                              )
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <label className="line-price">
                          <span>{t.price}</span>
                          <input
                            aria-label={`${t.price} ${l.product.name}`}
                            inputMode="decimal"
                            value={l.price}
                            disabled={!manager || busy || !!pending}
                            onChange={(e) =>
                              setCart((rows) =>
                                rows.map((r) =>
                                  r === l ? { ...r, price: e.target.value } : r,
                                ),
                              )
                            }
                          />
                        </label>
                        <strong>
                          {Number.isFinite(lineCents(l.quantity, l.price))
                            ? billMoney(
                                lineCents(l.quantity, l.price) / 100,
                                business.currency,
                                lang,
                              )
                            : "—"}
                        </strong>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    className="checkout-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ShoppingBag size={42} />
                    <h3>{t.empty}</h3>
                    <p>{t.emptyHelp}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {cart.length > 0 && (
              <>
                <div className="checkout-customer">
                  <label>
                    {t.customer}
                    <input
                      maxLength={120}
                      value={customer}
                      disabled={busy || !!pending}
                      onChange={(e) => setCustomer(e.target.value)}
                    />
                  </label>
                  <label>
                    {t.phone}
                    <input
                      type="tel"
                      maxLength={30}
                      value={phone}
                      disabled={busy || !!pending}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                </div>
                <div className="bill-totals">
                  <div>
                    <span>{t.subtotal}</span>
                    <strong>
                      {Number.isFinite(subtotal)
                        ? billMoney(subtotal / 100, business.currency, lang)
                        : "—"}
                    </strong>
                  </div>
                  <label>
                    {t.discount}
                    <input
                      aria-label={t.discount}
                      inputMode="decimal"
                      value={discount}
                      placeholder="0.00"
                      disabled={!manager || busy || !!pending}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </label>
                  {!manager && <small className="muted">{t.staffPrice}</small>}
                  <div className="bill-grand-total">
                    <span>{t.total}</span>
                    <strong>
                      {Number.isFinite(total)
                        ? billMoney(total / 100, business.currency, lang)
                        : "—"}
                    </strong>
                  </div>
                </div>
                <label>
                  {t.payment}
                  <select
                    value={payment}
                    disabled={busy || !!pending}
                    onChange={(e) => setPayment(e.target.value)}
                  >
                    {(["cash", "upi", "card", "other"] as const).map((v) => (
                      <option value={v} key={v}>
                        {t[v]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="button primary full checkout-pay"
              disabled={!valid || busy || !!pending}
              onClick={() => setConfirm(true)}
            >
              {busy ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <ArrowRight size={20} />
              )}{" "}
              {busy ? t.saving : t.complete}
            </motion.button>
          </section>
        </div>
      )}
      <Sheet open={scan} onClose={() => setScan(false)} title={t.scan}>
        <p className="muted">
          {cart.length} {t.items} · {t.cart}
        </p>
        <Scanner onResult={lookup} continuous />
        <button className="button primary full" onClick={() => setScan(false)}>
          {t.review}
        </button>
      </Sheet>
      <Sheet
        open={barcode !== undefined}
        onClose={() => setBarcode(undefined)}
        title={t.addProduct}
      >
        <p className="muted">{t.missing}</p>
        <ProductForm
          canViewCosts={["owner", "admin"].includes(business.role || "")}
          businessId={business.id}
          barcode={barcode}
          onDone={async () => {
            const code = barcode;
            setBarcode(undefined);
            await client.invalidateQueries();
            if (code) await lookup(code);
          }}
        />
      </Sheet>
      <Sheet
        open={confirm}
        onClose={() => {
          if (!busy && !pending) setConfirm(false);
        }}
        title={t.review}
      >
        <p className="muted">{t.confirmHelp}</p>
        <div className="bill-grand-total">
          <span>{t.total}</span>
          <strong>{billMoney(total / 100, business.currency, lang)}</strong>
        </div>
        <p>
          {cart.length} {t.items} ·{" "}
          {t[payment as "cash" | "upi" | "card" | "other"]}
        </p>
        {error && (
          <p role="alert" className="error-box">
            {tr(error)}
          </p>
        )}
        <button className="button primary full" disabled={busy} onClick={save}>
          {busy ? t.saving : pending ? t.retry : t.confirm}
        </button>
        <button
          className="button subtle full"
          disabled={busy || !!pending}
          onClick={() => setConfirm(false)}
        >
          {t.cancel}
        </button>
      </Sheet>
      {receipt && (
        <BillDetail
          sale={receipt}
          userId={userId}
          business={business}
          lang={lang}
          onClose={() => setReceipt(undefined)}
          onUpdate={setReceipt}
        />
      )}
    </div>
  );
}
function BillHistory({
  business,
  lang,
  onSelect,
}: {
  business: Business;
  lang: CheckoutLanguage;
  onSelect: (s: Sale) => void;
}) {
  const { tr } = useLanguage();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    t = checkoutCopy[lang];
  const bills = useQuery({
    queryKey: ["bills", business.id, page, search],
    queryFn: () =>
      api<Sale[]>(
        `sales?page=${page}&q=${encodeURIComponent(search)}`,
        {},
        business.id,
      ),
  });
  return (
    <section className="panel bill-history">
      <div className="checkout-cart-heading">
        <h2>{business.role === "staff" ? t.ownBills : t.allBills}</h2>
      </div>
      <label>
        <span className="sr-only">{t.billSearch}</span>
        <input
          aria-label={t.billSearch}
          placeholder={t.billSearch}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {bills.isPending ? (
        <p>{t.loading}</p>
      ) : bills.error ? (
        <p role="alert">{tr(bills.error.message)}</p>
      ) : bills.data.data.length ? (
        bills.data.data.map((s) => (
          <button
            className="bill-history-row"
            key={s.id}
            onClick={() => onSelect(s)}
          >
            <span className="action-icon green">
              <ReceiptText size={19} />
            </span>
            <span>
              <strong>{s.number}</strong>
              <small>
                {s.cashier_name} ·{" "}
                {new Date(s.created_at).toLocaleString(
                  lang === "hi" ? "hi-IN" : "en-IN",
                )}
              </small>
              {s.customer_name && <small>{s.customer_name}</small>}
            </span>
            <span>
              <strong>{billMoney(s.total, s.currency, lang)}</strong>
              <small>{t[s.status]}</small>
            </span>
          </button>
        ))
      ) : (
        <div className="checkout-empty">
          <ReceiptText size={38} />
          <h3>{t.noBills}</h3>
        </div>
      )}
      <div className="checkout-pagination">
        <button
          className="button subtle"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {t.previous}
        </button>
        <span>{page}</span>
        <button
          className="button subtle"
          disabled={page >= (bills.data?.meta.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          {t.next}
        </button>
      </div>
    </section>
  );
}
export function BillDetail({
  sale,
  business,
  userId,
  lang,
  onClose,
  onUpdate,
}: {
  sale: Sale;
  userId: number;
  business: Business;
  lang: CheckoutLanguage;
  onClose: () => void;
  onUpdate: (s: Sale) => void;
}) {
  const { tr } = useLanguage();
  const t = checkoutCopy[lang],
    client = useQueryClient(),
    [returning, setReturning] = useState(false),
    [quantities, setQuantities] = useState<Record<number, string>>({}),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const returnRequest = useRef<{
      idempotency_key: string;
      reason: string;
      items: { sale_item_id: number; quantity: string }[];
    } | null>(null),
    [uncertain, setUncertain] = useState(false);
  const returnKey = `stoqo-return-pending:${userId}:${business.id}:${sale.id}`;
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(returnKey);
      if (stored) {
        returnRequest.current = JSON.parse(stored);
        setReturning(true);
        setUncertain(true);
        setError(t.pending);
      }
    } catch {}
  }, [returnKey, t.pending]);
  const refund = sale.returns.reduce((a, r) => a + Number(r.amount), 0);
  async function share() {
    const text = [
      sale.business_name,
      `${t.bill}: ${sale.number}`,
      `${t.date}: ${new Date(sale.created_at).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}`,
      ...sale.items.map(
        (i) =>
          `${i.name} × ${i.quantity}: ${billMoney(i.line_total, sale.currency, lang)}`,
      ),
      `${t.discount}: ${billMoney(sale.discount, sale.currency, lang)}`,
      `${t.total}: ${billMoney(sale.total, sale.currency, lang)}`,
      `${t.status}: ${t[sale.status]}`,
      `${t.refundTotal}: ${billMoney(refund, sale.currency, lang)}`,
      t.noTax,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: sale.number, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t.copied);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        toast.error(tr((e as Error).message));
    }
  }
  return (
    <Sheet
      open
      onClose={() => {
        if (!busy && !uncertain) onClose();
      }}
      title={`${t.bill} ${sale.number}`}
    >
      <div className="receipt" id="stoqo-receipt">
        <div className="receipt-brand">
          <span>stoqo.</span>
          <h2>{sale.business_name}</h2>
          <p>{t.receipt}</p>
        </div>
        <div className="receipt-meta">
          <strong>{sale.number}</strong>
          <span>
            {new Date(sale.created_at).toLocaleString(
              lang === "hi" ? "hi-IN" : "en-IN",
            )}
          </span>
          <span>
            {t.cashier}: {sale.cashier_name}
          </span>
          {sale.customer_name && <span>{sale.customer_name}</span>}
          {sale.customer_phone && <span>{sale.customer_phone}</span>}
          <span>
            {t.paid}: {t[sale.payment_method]}
          </span>
          <span>
            {t.status}: {t[sale.status]}
          </span>
        </div>
        <table className="receipt-lines">
          <thead>
            <tr>
              <th>{t.items}</th>
              <th>{t.quantity}</th>
              <th>{t.price}</th>
              <th>{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.name}
                  {+i.returned_quantity > 0 && (
                    <small>
                      {t.returned}: {i.returned_quantity}
                    </small>
                  )}
                </td>
                <td>{units(i.quantity)}</td>
                <td>{billMoney(i.unit_price, sale.currency, lang)}</td>
                <td>{billMoney(i.gross_total, sale.currency, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bill-totals">
          <div>
            <span>{t.subtotal}</span>
            <strong>{billMoney(sale.subtotal, sale.currency, lang)}</strong>
          </div>
          <div>
            <span>{t.discount}</span>
            <strong>−{billMoney(sale.discount, sale.currency, lang)}</strong>
          </div>
          <div className="bill-grand-total">
            <span>{t.total}</span>
            <strong>{billMoney(sale.total, sale.currency, lang)}</strong>
          </div>
          {refund > 0 && (
            <>
              <div>
                <span>{t.refundTotal}</span>
                <strong>{billMoney(refund, sale.currency, lang)}</strong>
              </div>
              <div>
                <span>{t.netTotal}</span>
                <strong>
                  {billMoney(Number(sale.total) - refund, sale.currency, lang)}
                </strong>
              </div>
            </>
          )}
        </div>
        <p className="receipt-footer">{t.noTax}</p>
      </div>
      <div className="receipt-actions">
        <button className="button primary" onClick={() => window.print()}>
          <Printer size={18} />
          {t.print}
        </button>
        <button className="button subtle" onClick={share}>
          <Share2 size={18} />
          {t.share}
        </button>
      </div>
      {sale.returns.map((r) => (
        <div className="return-record" key={r.id}>
          <strong>
            {t.refund}: {billMoney(r.amount, sale.currency, lang)}
          </strong>
          <p>{r.reason}</p>
          <small>
            {t.returnedBy} {r.user_name} ·{" "}
            {new Date(r.created_at).toLocaleString(
              lang === "hi" ? "hi-IN" : "en-IN",
            )}
          </small>
        </div>
      ))}
      {business.role !== "staff" && sale.status !== "returned" && (
        <button
          className="button subtle full"
          onClick={() => setReturning(!returning)}
          disabled={busy || uncertain}
        >
          <RotateCcw size={18} />
          {t.returnAction}
        </button>
      )}
      {returning && (
        <form
          className="return-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            const payload = returnRequest.current || {
              idempotency_key: crypto.randomUUID(),
              reason,
              items: sale.items
                .filter((i) => Number(quantities[i.id]) > 0)
                .map((i) => ({
                  sale_item_id: i.id,
                  quantity: quantities[i.id],
                })),
            };
            returnRequest.current = payload;
            try {
              sessionStorage.setItem(returnKey, JSON.stringify(payload));
              const r = await api<Sale>(
                `sales/${sale.id}/return_items`,
                {
                  method: "POST",
                  body: JSON.stringify({ sale_return: payload }),
                },
                business.id,
              );
              sessionStorage.removeItem(returnKey);
              onUpdate(r.data);
              setReturning(false);
              setUncertain(false);
              returnRequest.current = null;
              setQuantities({});
              setReason("");
              await client.invalidateQueries();
              toast.success(t.refund);
            } catch (e) {
              setError((e as Error).message);
              if (e instanceof ApiError && e.status < 500) {
                sessionStorage.removeItem(returnKey);
                returnRequest.current = null;
                setUncertain(false);
              } else setUncertain(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="muted">{t.returnHelp}</p>
          {sale.items
            .filter((i) => +i.returned_quantity < +i.quantity)
            .map((i) => (
              <label key={i.id}>
                {i.name} · {units(+i.quantity - +i.returned_quantity)}{" "}
                {t.remaining}
                <input
                  aria-label={`${t.returnQty} ${i.name}`}
                  type="number"
                  step="0.001"
                  min="0"
                  max={+i.quantity - +i.returned_quantity}
                  disabled={busy || uncertain}
                  value={quantities[i.id] || ""}
                  onChange={(e) =>
                    setQuantities({ ...quantities, [i.id]: e.target.value })
                  }
                />
              </label>
            ))}
          <label>
            {t.reason}
            <input
              required
              maxLength={500}
              disabled={busy || uncertain}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error-box">
              {tr(error)}
            </p>
          )}
          <button
            className="button primary full"
            disabled={
              busy ||
              (!uncertain && !Object.values(quantities).some((q) => +q > 0))
            }
          >
            {busy ? t.saving : uncertain ? t.retry : t.returnConfirm}
          </button>
        </form>
      )}
      <button
        className="button subtle full"
        disabled={busy || uncertain}
        onClick={onClose}
      >
        {t.close}
      </button>
    </Sheet>
  );
}
