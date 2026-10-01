"use client";
import { useLanguage } from "@/components/language-provider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
export default function Join() {
  const { tr, language } = useLanguage();
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [auth, setAuth] = useState(false);
  useEffect(() => {
    const t =
      new URLSearchParams(location.hash.slice(1)).get("token") ||
      sessionStorage.getItem("stoqo_invitation") ||
      "";
    if (t) {
      sessionStorage.setItem("stoqo_invitation", t);
      setToken(t);
      history.replaceState(null, "", "/join");
    }
  }, []);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{tr("Join your store.")}</h1>
        <p>
          {tr(
            "Use the email address your store owner invited. Your own login keeps every stock change accountable.",
          )}
        </p>
        {!token ? (
          <p>{tr("Open the invitation link from your store owner.")}</p>
        ) : (
          <button
            className="button primary full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await api<{ business_id: number }>(
                  "team_invitations/accept",
                  { method: "POST", body: JSON.stringify({ token }) },
                );
                sessionStorage.removeItem("stoqo_invitation");
                localStorage.setItem(
                  "stoqo_business",
                  String(r.data.business_id),
                );
                location.href = "/app";
              } catch (e) {
                if (e instanceof ApiError && e.status === 401) setAuth(true);
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? tr("Joining…") : tr("Accept invitation")}
          </button>
        )}
        {error && (
          <p role="alert" className="error-box">
            {tr(error)}
          </p>
        )}
        {auth && (
          <p>
            <Link href="/login">{tr("Sign in")}</Link> {tr("or")}
            <Link href="/signup">{tr("create your account")}</Link>
            {tr(", then accept this invitation.")}
          </p>
        )}
      </section>
    </main>
  );
}
