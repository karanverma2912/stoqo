"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ReceiptText } from "lucide-react";
import { api } from "@/lib/api";
import { billMoney, type Sale } from "@/lib/sales";
import type { Business, Meta } from "@/lib/types";
import { useLanguage } from "./language-provider";
const BillDetail = dynamic(
  () => import("./checkout").then((m) => m.BillDetail),
  { ssr: false },
);
type Summary = {
  date: string;
  timezone: string;
  currency: string;
  totals: {
    bills: number;
    gross_sales: string;
    discounts: string;
    sales: string;
    returns: string;
    return_count: number;
    net: string;
  };
  employees: {
    id: number;
    name: string;
    role: string | null;
    bills: number;
    sales: string;
    discounts: string;
    return_count: number;
    returns_processed: string;
  }[];
  payments: { method: string; sales: string; returns: string; net: string }[];
  bills: {
    id: number;
    number: string;
    cashier_name: string;
    payment_method: string;
    total: string;
    created_at: string;
  }[];
  returns: {
    id: number;
    sale_id: number;
    number: string;
    seller: string;
    processed_by: string;
    amount: string;
    reason: string;
    created_at: string;
    original_payment_method: string;
  }[];
  bills_meta: Meta;
  returns_meta: Meta;
};
export function DailySummary({
  business,
  userId,
}: {
  business: Business;
  userId: number;
}) {
  const { tr, language } = useLanguage();
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(
      new Date(),
    ),
  );
  const [employee, setEmployee] = useState("");
  const [salesPage, setSalesPage] = useState(1),
    [returnsPage, setReturnsPage] = useState(1);
  const [selected, setSelected] = useState<number>();
  const query = useQuery({
    queryKey: [
      "daily-summary",
      business.id,
      date,
      employee,
      salesPage,
      returnsPage,
    ],
    queryFn: () =>
      api<Summary>(
        `reports/daily_summary?${new URLSearchParams({ date, employee_id: employee, sales_page: String(salesPage), returns_page: String(returnsPage) })}`,
        {},
        business.id,
      ),
    enabled: !!date,
  });
  const receipt = useQuery({
    queryKey: ["owner-summary-bill", business.id, selected],
    queryFn: () => api<Sale>(`sales/${selected}`, {}, business.id),
    enabled: selected !== undefined,
  });
  const d = query.data?.data;
  const money = (value: string) =>
    billMoney(value, business.currency, language);
  const time = (value: string) =>
    new Date(value).toLocaleTimeString(language === "hi" ? "hi-IN" : "en-IN", {
      timeZone: business.timezone,
      hour: "2-digit",
      minute: "2-digit",
    });
  function pages(meta: Meta, set: (page: number) => void) {
    return (
      meta.pages > 1 && (
        <div className="daily-pager">
          <button
            className="button subtle"
            disabled={meta.page <= 1 || query.isFetching}
            onClick={() => set(meta.page - 1)}
          >
            {tr("Previous")}
          </button>
          <span>
            {meta.page} / {meta.pages}
          </span>
          <button
            className="button subtle"
            disabled={meta.page >= meta.pages || query.isFetching}
            onClick={() => set(meta.page + 1)}
          >
            {tr("Next")}
          </button>
        </div>
      )
    );
  }
  return (
    <section className="daily-summary" aria-label={tr("Daily store summary")}>
      <div className="page-heading">
        <div>
          <h2>{tr("Daily store summary")}</h2>
          <p>
            {tr("Sales and returns for your business day.")} ·{" "}
            {business.timezone}
          </p>
        </div>
        <div className="daily-controls">
          <label>
            {tr("Summary date")}
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSalesPage(1);
                setReturnsPage(1);
              }}
            />
          </label>
          <button
            className="button subtle"
            aria-label={tr("Refresh summary")}
            disabled={!date || query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
      {!date ? (
        <p>{tr("Choose a date to view the summary.")}</p>
      ) : query.isPending ? (
        <p role="status">{tr("Loading summary…")}</p>
      ) : query.error ? (
        <p className="error-box" role="alert">
          {tr(query.error.message)}
        </p>
      ) : (
        d && (
          <>
            <div className="stats-grid">
              {[
                ["Sales after discounts", money(d.totals.sales)],
                ["Returns processed", money(d.totals.returns)],
                ["Sales minus returns", money(d.totals.net)],
                ["Bills completed", String(d.totals.bills)],
              ].map(([label, value]) => (
                <article className="stat-card" key={label}>
                  <span>{tr(label)}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <p className="muted">
              {tr("Gross sales")}: {money(d.totals.gross_sales)} ·{" "}
              {tr("Discounts")}: {money(d.totals.discounts)} ·{" "}
              {tr("Return transactions")}: {d.totals.return_count}
            </p>
            <p className="muted">
              {tr(
                "Returns count on the day processed, including older bills. Net can be negative.",
              )}
            </p>
            <section className="panel report-panel">
              <h3>{tr("Employee activity")}</h3>
              <p className="muted">
                {tr(
                  "Sales belong to the seller. Returns belong to the person who processed them.",
                )}
              </p>
              <div className="daily-employees">
                {d.employees.map((e) => (
                  <article className="daily-employee" key={e.id}>
                    <strong>{e.name}</strong>
                    <span className="muted">
                      {tr(e.role || "Former team member")}
                    </span>
                    <dl>
                      <div>
                        <dt>{tr("Bills completed")}</dt>
                        <dd>{e.bills}</dd>
                      </div>
                      <div>
                        <dt>{tr("Sales after discounts")}</dt>
                        <dd>{money(e.sales)}</dd>
                      </div>
                      <div>
                        <dt>{tr("Discounts")}</dt>
                        <dd>{money(e.discounts)}</dd>
                      </div>
                      <div>
                        <dt>{tr("Returns processed")}</dt>
                        <dd>
                          {money(e.returns_processed)} ({e.return_count})
                        </dd>
                      </div>
                    </dl>
                    <button
                      className="button subtle"
                      onClick={() => {
                        setEmployee(String(e.id));
                        setSalesPage(1);
                        setReturnsPage(1);
                      }}
                    >
                      {tr("View transactions")}
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel report-panel">
              <h3>{tr("Payment breakdown")}</h3>
              <p className="muted">
                {tr(
                  "Returns are grouped by the original bill payment method. These are not cash-drawer balances or confirmed refund payments.",
                )}
              </p>
              <div className="daily-employees">
                {d.payments.map((p) => (
                  <article className="daily-employee" key={p.method}>
                    <strong>{tr(p.method)}</strong>
                    <dl>
                      <div>
                        <dt>{tr("Sales after discounts")}</dt>
                        <dd>{money(p.sales)}</dd>
                      </div>
                      <div>
                        <dt>{tr("Returns processed")}</dt>
                        <dd>{money(p.returns)}</dd>
                      </div>
                      <div>
                        <dt>{tr("Sales minus returns")}</dt>
                        <dd>{money(p.net)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
            <label className="daily-filter">
              {tr("Transaction employee")}
              <select
                value={employee}
                onChange={(e) => {
                  setEmployee(e.target.value);
                  setSalesPage(1);
                  setReturnsPage(1);
                }}
              >
                <option value="">{tr("All employees")}</option>
                {d.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              {tr(
                "The employee filter applies to the lists below. Store totals stay unchanged.",
              )}
            </p>
            <div className="dashboard-columns">
              <section className="panel report-panel">
                <h3>
                  {tr("Bills completed")} ({d.bills_meta.total})
                </h3>
                {!d.bills.length && <p>{tr("No bills for this selection.")}</p>}
                {d.bills.map((b) => (
                  <button
                    className="daily-transaction"
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                  >
                    <ReceiptText size={18} />
                    <span>
                      <strong>{b.number}</strong>
                      <small>
                        {b.cashier_name} · {time(b.created_at)} ·{" "}
                        {tr(b.payment_method)}
                      </small>
                    </span>
                    <strong>{money(b.total)}</strong>
                  </button>
                ))}
                {pages(d.bills_meta, setSalesPage)}
              </section>
              <section className="panel report-panel">
                <h3>
                  {tr("Returns processed")} ({d.returns_meta.total})
                </h3>
                {!d.returns.length && (
                  <p>{tr("No returns for this selection.")}</p>
                )}
                {d.returns.map((r) => (
                  <button
                    className="daily-transaction"
                    key={r.id}
                    onClick={() => setSelected(r.sale_id)}
                  >
                    <ReceiptText size={18} />
                    <span>
                      <strong>{r.number}</strong>
                      <small>
                        {tr("Processed by")}: {r.processed_by} ·{" "}
                        {time(r.created_at)}
                      </small>
                      <small>
                        {tr("Original seller")}: {r.seller}
                      </small>
                      <small>{r.reason}</small>
                    </span>
                    <strong>{money(r.amount)}</strong>
                  </button>
                ))}
                {pages(d.returns_meta, setReturnsPage)}
              </section>
            </div>
          </>
        )
      )}
      {selected !== undefined && receipt.isPending && (
        <p role="status">{tr("Loading bill…")}</p>
      )}
      {selected !== undefined && receipt.error && (
        <p role="alert" className="error-box">
          {tr(receipt.error.message)}
        </p>
      )}
      {selected !== undefined && receipt.data && (
        <BillDetail
          key={selected}
          sale={receipt.data.data}
          business={business}
          userId={userId}
          lang={language}
          onClose={() => setSelected(undefined)}
          onUpdate={() => {
            void receipt.refetch();
            void query.refetch();
          }}
        />
      )}
    </section>
  );
}
