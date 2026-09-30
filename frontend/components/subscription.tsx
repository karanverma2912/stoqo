"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  Clock3,
  Users,
  Package,
  ShieldCheck,
  LoaderCircle,
  ChevronLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { billMoney } from "@/lib/sales";
import type { Business } from "@/lib/types";
import type { Plan, Subscription } from "@/lib/subscriptions";
import { Sheet } from "./ui/sheet";
import { toast } from "sonner";
export function useSubscription(id: number, page = 1) {
  return useQuery({
    queryKey: ["subscription", id, page],
    queryFn: () => api<Subscription>(`subscriptions?page=${page}`, {}, id),
    refetchInterval: 60000,
  });
}
function statusText(s: Subscription) {
  return s.status === "trial"
    ? `${s.days_remaining} days left in your trial`
    : s.status === "active"
      ? s.days_remaining !== null && s.days_remaining <= 7
        ? `${s.days_remaining} days of paid access remaining`
        : "Your plan is active"
      : s.status === "expired"
        ? "Your subscription has ended"
        : "Your workspace is read-only";
}
export function SubscriptionNotice({ business }: { business: Business }) {
  const q = useSubscription(business.id);
  const s = q.data?.data;
  if (!s || (s.writable && (s.days_remaining === null || s.days_remaining > 7)))
    return null;
  return (
    <aside
      className={`subscription-notice ${s.writable ? "" : "subscription-readonly"}`}
      aria-label="Subscription status"
    >
      <Clock3 size={19} />
      <div>
        <strong>{statusText(s)}</strong>
        <p>
          {s.writable
            ? "Review your plan before access expires."
            : s.can_manage
              ? "Your records are safe. Viewing and export remain available; adding products, billing and stock changes are paused."
              : "You can still view your records. Ask the owner to renew before adding products or changing stock."}
        </p>
      </div>
      <Link className="button subtle" href="/app/subscription">
        {s.can_manage ? "Review plan" : "Plan details"}
      </Link>
    </aside>
  );
}
function Usage({
  label,
  used,
  limit,
  detail,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number | null;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="subscription-usage">
      <span>
        <Icon size={19} />
        {label}
      </span>
      <strong>
        {used}
        <small> / {limit ?? "Unlimited"}</small>
      </strong>
      {limit !== null && (
        <progress
          aria-label={label}
          max={limit}
          value={Math.min(used, limit)}
        />
      )}
      <p>{detail}</p>
      {limit !== null && used >= limit && (
        <small className="setup-warning">
          {used > limit ? "Above your plan limit" : "Limit reached"} · existing
          records are kept.
        </small>
      )}
    </div>
  );
}
export function SubscriptionPage({ business }: { business: Business }) {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<Plan>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [cancel, setCancel] = useState(false),
    lock = useRef(false),
    client = useQueryClient();
  const q = useSubscription(business.id, page),
    s = q.data?.data;
  async function submit() {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api(
        "subscriptions/requests",
        { method: "POST", body: JSON.stringify({ plan_id: selected.id }) },
        business.id,
      );
      await client.invalidateQueries({
        queryKey: ["subscription", business.id],
      });
      setSelected(undefined);
      toast.success("Plan request saved. No payment taken.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function cancelRequest() {
    if (!s?.pending_request || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api(
        `subscriptions/requests/${s.pending_request.id}`,
        { method: "DELETE" },
        business.id,
      );
      await client.invalidateQueries({
        queryKey: ["subscription", business.id],
      });
      setCancel(false);
      toast.success("Request cancelled. Your current plan is unchanged.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const date = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      timeZone: business.timezone,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (q.isPending) return <p>Loading plans and usage…</p>;
  if (q.error || !s)
    return (
      <div role="alert" className="error-box">
        {q.error?.message || "Unable to load subscription"}
        <button className="button subtle" onClick={() => q.refetch()}>
          Try again
        </button>
      </div>
    );
  const seats = s.usage.members + s.usage.pending_invitations;
  return (
    <div className="subscription-page">
      <Link href="/app" className="text-link">
        <ChevronLeft size={16} />
        Overview
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ROOM FOR YOUR BUSINESS</span>
          <h1>
            Plans & usage<span className="accent-period">.</span>
          </h1>
          <p>A clear view of your access, team and next step.</p>
        </div>
        <span className="subscription-status">
          <span className="tiny-dot" />
          {s.status === "trial"
            ? "Free trial"
            : s.status === "active"
              ? "Active"
              : "Read-only"}
        </span>
      </div>
      <section className="subscription-current">
        <div>
          <span className="eyebrow">CURRENT PLAN</span>
          <h2>{s.current_plan.name}</h2>
          <p>{statusText(s)}</p>
          <small>
            {s.billing_status === "trial"
              ? `Trial ${s.writable ? "ends" : "ended"} ${date(s.trial_ends_at)}. No automatic charge.`
              : s.subscription_ends_at
                ? `Paid access ends ${date(s.subscription_ends_at)}. No automatic renewal.`
                : "No paid-through date is set."}
          </small>
        </div>
        <div className="subscription-current-price">
          <strong>
            {billMoney(
              s.current_plan.monthly_price_paise / 100,
              s.current_plan.currency,
            )}
          </strong>
          <span>/ month · plan price</span>
        </div>
      </section>
      <div className="subscription-usage-grid">
        <Usage
          label="Team seats"
          used={seats}
          limit={s.current_plan.member_limit}
          detail={`${s.usage.members} members, including the owner · ${s.usage.pending_invitations} pending invitations`}
          icon={Users}
        />
        <Usage
          label="Saved products"
          used={s.usage.products}
          limit={s.current_plan.product_limit}
          detail="Each variant counts as one product. Archived products are included."
          icon={Package}
        />
      </div>
      {!s.writable && (
        <p className="subscription-access-note">
          Viewing remains available. Product creation, sales and stock changes
          resume after activation. Export is available to roles with report
          access.
        </p>
      )}
      {s.pending_request && (
        <section className="subscription-pending">
          <Clock3 size={22} />
          <div>
            <strong>{s.pending_request.plan_name} request pending</strong>
            <p>
              Request #{s.pending_request.id} ·{" "}
              {date(s.pending_request.created_at)} ·{" "}
              {billMoney(
                s.pending_request.monthly_price_paise / 100,
                s.pending_request.currency,
              )}
              /month
            </p>
            <small>
              No payment has been collected and your current access has not
              changed.
            </small>
          </div>
          <button
            className="button subtle"
            onClick={() => {
              setError("");
              setCancel(true);
            }}
          >
            Cancel request
          </button>
        </section>
      )}
      <div className="subscription-section-title">
        <h2>Choose your next plan</h2>
        <p>
          {s.can_manage
            ? "Requests are saved for manual review. Online payment collection is not connected yet."
            : "Only the owner or an admin can request or change plans."}
        </p>
      </div>
      <div className="subscription-plans">
        {s.plans.map((plan) => (
          <motion.section
            whileHover={{ y: -3 }}
            className={`subscription-plan ${plan.id === s.current_plan.id ? "current" : ""}`}
            key={plan.id}
          >
            <div className="subscription-plan-name">
              <h3>{plan.name}</h3>
              {plan.id === s.current_plan.id && <span>Current</span>}
            </div>
            <strong className="subscription-plan-price">
              {billMoney(plan.monthly_price_paise / 100, plan.currency)}
              <small>/month</small>
            </strong>
            <ul>
              <li>
                <Check size={17} />
                {plan.member_limit} users, including owner
              </li>
              <li>
                <Check size={17} />
                {plan.product_limit
                  ? `${plan.product_limit} saved products`
                  : "Unlimited saved products"}
              </li>
              <li>
                <Check size={17} />
                Stock, checkout and saved bills
              </li>
              <li>
                <Check size={17} />
                Variants and barcode labels
              </li>
            </ul>
            {plan.capacity_error && (
              <p className="setup-warning">{plan.capacity_error}</p>
            )}
            <button
              className="button primary full"
              disabled={
                !s.can_manage || !!s.pending_request || !!plan.capacity_error
              }
              onClick={() => {
                setError("");
                setSelected(plan);
              }}
            >
              {s.pending_request?.subscription_plan_id === plan.id
                ? "Request pending"
                : plan.id === s.current_plan.id
                  ? s.status === "trial"
                    ? "Request this plan"
                    : "Request renewal"
                  : "Request plan"}
            </button>
          </motion.section>
        ))}
      </div>
      <p className="subscription-fineprint">
        <ShieldCheck size={17} />
        Your data is kept when access expires. A plan request is not a payment
        or tax invoice. Limits and trial duration are configured by Stoqo.
      </p>
      {s.can_manage && (
        <section className="subscription-history">
          <h2>Request history</h2>
          {s.requests.length ? (
            s.requests.map((r) => (
              <div className="subscription-history-row" key={r.id}>
                <span>
                  <strong>{r.plan_name}</strong>
                  <small>
                    #{r.id} · {date(r.created_at)}
                  </small>
                </span>
                <span>
                  {billMoney(r.monthly_price_paise / 100, r.currency)}
                  <small>
                    {r.status}
                    {r.activated_until
                      ? ` · active until ${date(r.activated_until)}`
                      : ""}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No plan requests yet.</p>
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
              disabled={page >= (q.data?.meta.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}
      <Sheet
        open={!!selected}
        onClose={() => {
          if (!busy) setSelected(undefined);
        }}
        title={selected ? `Request ${selected.name}` : "Request plan"}
      >
        <p>
          {selected &&
            billMoney(
              selected.monthly_price_paise / 100,
              selected.currency,
            )}{" "}
          per month
        </p>
        <p className="muted">
          This saves a request for the Stoqo operator to review. It does not
          take payment, send an email or change your current limits. Paid access
          begins only after payment is verified and activation is approved.
        </p>
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary full"
          disabled={busy}
          onClick={submit}
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Check size={18} />
          )}
          Save plan request
        </button>
      </Sheet>
      <Sheet
        open={cancel}
        onClose={() => {
          if (!busy) setCancel(false);
        }}
        title="Cancel this request?"
      >
        <p>
          Your current subscription stays as it is. You can submit another
          request afterwards.
        </p>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <button
          className="button primary full"
          disabled={busy}
          onClick={cancelRequest}
        >
          {busy ? "Cancelling…" : "Confirm cancellation"}
        </button>
      </Sheet>
    </div>
  );
}
