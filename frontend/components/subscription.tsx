"use client";

import { useLanguage } from "@/components/language-provider";

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
function statusText(s: Subscription, tr: ReturnType<typeof useLanguage>["tr"]) {
  return s.status === "trial"
    ? tr("{count} days left in your trial", { count: s.days_remaining ?? 0 })
    : s.status === "active"
      ? s.days_remaining !== null && s.days_remaining <= 7
        ? tr("{count} days of paid access remaining", {
            count: s.days_remaining ?? 0,
          })
        : tr("Your plan is active")
      : s.status === "expired"
        ? tr("Your subscription has ended")
        : tr("Your workspace is read-only");
}
export function SubscriptionNotice({ business }: { business: Business }) {
  const { tr, language } = useLanguage();
  const q = useSubscription(business.id);
  const s = q.data?.data;
  if (!s || (s.writable && (s.days_remaining === null || s.days_remaining > 7)))
    return null;
  return (
    <aside
      className={`subscription-notice ${s.writable ? "" : "subscription-readonly"}`}
      aria-label={tr("Subscription status")}
    >
      <Clock3 size={19} />
      <div>
        <strong>{statusText(s, tr)}</strong>
        <p>
          {s.writable
            ? tr("Review your plan before access expires.")
            : s.can_manage
              ? tr(
                  "Your records are safe. Viewing and export remain available; adding products, billing and stock changes are paused.",
                )
              : tr(
                  "You can still view your records. Ask the owner to renew before adding products or changing stock.",
                )}
        </p>
      </div>
      <Link className="button subtle" href="/app/subscription">
        {s.can_manage ? tr("Review plan") : tr("Plan details")}
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
  const { tr, language } = useLanguage();
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
          {used > limit ? tr("Above your plan limit") : tr("Limit reached")}{" "}
          {tr("· existing records are kept.")}
        </small>
      )}
    </div>
  );
}
export function SubscriptionPage({ business }: { business: Business }) {
  const { tr, language } = useLanguage();
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
      toast.success(tr("Plan request saved. No payment taken."));
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
      toast.success(tr("Request cancelled. Your current plan is unchanged."));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const date = (d: string) =>
    new Date(d).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
      timeZone: business.timezone,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (q.isPending) return <p>{tr("Loading plans and usage…")}</p>;
  if (q.error || !s)
    return (
      <div role="alert" className="error-box">
        {tr(q.error?.message || "Unable to load subscription")}
        <button className="button subtle" onClick={() => q.refetch()}>
          {tr("Try again")}
        </button>
      </div>
    );
  const seats = s.usage.members + s.usage.pending_invitations;
  return (
    <div className="subscription-page">
      <Link href="/app" className="text-link">
        <ChevronLeft size={16} />
        {tr("Overview")}
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("ROOM FOR YOUR BUSINESS")}</span>
          <h1>
            {tr("Plans & usage")}
            <span className="accent-period">.</span>
          </h1>
          <p>{tr("A clear view of your access, team and next step.")}</p>
        </div>
        <span className="subscription-status">
          <span className="tiny-dot" />
          {s.status === "trial"
            ? tr("Free trial")
            : s.status === "active"
              ? tr("Active")
              : tr("Read-only")}
        </span>
      </div>
      <section className="subscription-current">
        <div>
          <span className="eyebrow">{tr("CURRENT PLAN")}</span>
          <h2>{s.current_plan.name}</h2>
          <p>{statusText(s, tr)}</p>
          <small>
            {s.billing_status === "trial"
              ? tr(
                  s.writable
                    ? "Trial ends {date}. No automatic charge."
                    : "Trial ended {date}. No automatic charge.",
                  { date: date(s.trial_ends_at) },
                )
              : s.subscription_ends_at
                ? tr("Paid access ends {date}. No automatic renewal.", {
                    date: date(s.subscription_ends_at),
                  })
                : tr("No paid-through date is set.")}
          </small>
        </div>
        <div className="subscription-current-price">
          <strong>
            {billMoney(
              s.current_plan.monthly_price_paise / 100,
              s.current_plan.currency,
            )}
          </strong>
          <span>{tr("/ month · plan price")}</span>
        </div>
      </section>
      <div className="subscription-usage-grid">
        <Usage
          label={tr("Team seats")}
          used={seats}
          limit={s.current_plan.member_limit}
          detail={tr(
            "{members} members, including the owner · {pending} pending invitations",
            { members: s.usage.members, pending: s.usage.pending_invitations },
          )}
          icon={Users}
        />
        <Usage
          label={tr("Saved products")}
          used={s.usage.products}
          limit={s.current_plan.product_limit}
          detail="Each variant counts as one product. Archived products are included."
          icon={Package}
        />
      </div>
      {!s.writable && (
        <p className="subscription-access-note">
          {tr(
            "Viewing remains available. Product creation, sales and stock changes resume after activation. Export is available to roles with report access.",
          )}
        </p>
      )}
      {s.pending_request && (
        <section className="subscription-pending">
          <Clock3 size={22} />
          <div>
            <strong>
              {s.pending_request.plan_name} {tr("request pending")}
            </strong>
            <p>
              {tr("Request #")} {s.pending_request.id} ·{" "}
              {date(s.pending_request.created_at)} ·{" "}
              {billMoney(
                s.pending_request.monthly_price_paise / 100,
                s.pending_request.currency,
              )}
              {tr("/month")}
            </p>
            <small>
              {tr(
                "No payment has been collected and your current access has not changed.",
              )}
            </small>
          </div>
          <button
            className="button subtle"
            onClick={() => {
              setError("");
              setCancel(true);
            }}
          >
            {tr("Cancel request")}
          </button>
        </section>
      )}
      <div className="subscription-section-title">
        <h2>{tr("Choose your next plan")}</h2>
        <p>
          {s.can_manage
            ? tr(
                "Requests are saved for manual review. Online payment collection is not connected yet.",
              )
            : tr("Only the owner or an admin can request or change plans.")}
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
              {plan.id === s.current_plan.id && <span>{tr("Current")}</span>}
            </div>
            <strong className="subscription-plan-price">
              {billMoney(plan.monthly_price_paise / 100, plan.currency)}
              <small>{tr("/month")}</small>
            </strong>
            <ul>
              <li>
                <Check size={17} />
                {plan.member_limit} {tr("users, including owner")}
              </li>
              <li>
                <Check size={17} />
                {plan.product_limit
                  ? tr("{count} saved products", { count: plan.product_limit })
                  : tr("Unlimited saved products")}
              </li>
              <li>
                <Check size={17} />
                {tr("Stock, checkout and saved bills")}
              </li>
              <li>
                <Check size={17} />
                {tr("Variants and barcode labels")}
              </li>
            </ul>
            {plan.capacity_error && (
              <p className="setup-warning">{tr(plan.capacity_error || "")}</p>
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
                ? tr("Request pending")
                : plan.id === s.current_plan.id
                  ? s.status === "trial"
                    ? tr("Request this plan")
                    : tr("Request renewal")
                  : tr("Request plan")}
            </button>
          </motion.section>
        ))}
      </div>
      <p className="subscription-fineprint">
        <ShieldCheck size={17} />
        {tr(
          "Your data is kept when access expires. A plan request is not a payment or tax invoice. Limits and trial duration are configured by Stoqo.",
        )}
      </p>
      {s.can_manage && (
        <section className="subscription-history">
          <h2>{tr("Request history")}</h2>
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
                    {tr(r.status)}
                    {r.activated_until
                      ? tr(" · active until {date}", {
                          date: date(r.activated_until),
                        })
                      : ""}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className="muted">{tr("No plan requests yet.")}</p>
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
              disabled={page >= (q.data?.meta.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              {tr("Next")}
            </button>
          </div>
        </section>
      )}
      <Sheet
        open={!!selected}
        onClose={() => {
          if (!busy) setSelected(undefined);
        }}
        title={
          selected
            ? tr("Request {plan}", { plan: selected.name })
            : tr("Request plan")
        }
      >
        <p>
          {selected &&
            billMoney(
              selected.monthly_price_paise / 100,
              selected.currency,
            )}{" "}
          {tr("per month")}
        </p>
        <p className="muted">
          {tr(
            "This saves a request for the Stoqo operator to review. It does not take payment, send an email or change your current limits. Paid access begins only after payment is verified and activation is approved.",
          )}
        </p>
        {error && (
          <p className="error-box" role="alert">
            {tr(error)}
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
          {tr("Save plan request")}
        </button>
      </Sheet>
      <Sheet
        open={cancel}
        onClose={() => {
          if (!busy) setCancel(false);
        }}
        title={tr("Cancel this request?")}
      >
        <p>
          {tr(
            "Your current subscription stays as it is. You can submit another request afterwards.",
          )}
        </p>
        {error && (
          <p role="alert" className="error-box">
            {tr(error)}
          </p>
        )}
        <button
          className="button primary full"
          disabled={busy}
          onClick={cancelRequest}
        >
          {busy ? tr("Cancelling…") : tr("Confirm cancellation")}
        </button>
      </Sheet>
    </div>
  );
}
