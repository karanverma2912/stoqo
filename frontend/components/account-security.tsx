"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";

const schema = z.object({
  current_password: z.string().min(1, "Enter your current password"),
  password: z.string().min(12, "Use at least 12 characters").max(72, "Use no more than 72 characters"),
  password_confirmation: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.password === values.password_confirmation, {
  message: "Passwords don’t match", path: ["password_confirmation"],
});

export function AccountSecurity() {
  const [expanded, setExpanded] = useState(false);
  return <section className="account-security">
    <button type="button" className="button subtle full" aria-expanded={expanded} aria-controls="account-security-panel" onClick={() => setExpanded(!expanded)}>
      <ShieldCheck size={18} /> Account security
    </button>
    {expanded && <div id="account-security-panel"><SecurityControls /></div>}
  </section>;
}

function SecurityControls() {
  const sessions = useQuery({queryKey: ["account-security"], queryFn: () => api<{active_sessions: number}>("auth/security")});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState(false);
  const form = useForm<z.infer<typeof schema>>({resolver: zodResolver(schema)});
  const busy = revoking || form.formState.isSubmitting;

  async function changePassword(values: z.infer<typeof schema>) {
    setError(""); setMessage("");
    try {
      await api("auth/change_password", {method: "POST", body: JSON.stringify(values)});
      form.reset();
      setMessage("Password changed. Other sessions have been signed out.");
      await sessions.refetch();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length) {
        setError(Object.entries(err.details).map(([field, messages]) => `${field.replaceAll("_", " ")}: ${messages.join(", ")}`).join(". "));
      } else setError((err as Error).message);
    }
  }

  async function revokeOthers() {
    const current_password = form.getValues("current_password");
    if (!current_password) {
      form.setError("current_password", {message: "Enter your current password to sign out other sessions"}, {shouldFocus: true});
      return;
    }
    setRevoking(true); setError(""); setMessage("");
    try {
      await api("auth/revoke_other_sessions", {method: "POST", body: JSON.stringify({current_password})});
      form.reset();
      setMessage("Other sessions signed out. You’re still signed in here.");
      await sessions.refetch();
    } catch (err) { setError((err as Error).message); }
    finally { setRevoking(false); }
  }

  return <form className="security-form" onSubmit={form.handleSubmit(changePassword)}>
    <h3>Keep your account secure</h3>
    <p className="muted">Changing your password signs out your other sessions. This applies to every workspace you belong to.</p>
    {sessions.data && <p className="muted">{sessions.data.data.active_sessions} active sign-in {sessions.data.data.active_sessions === 1 ? "session" : "sessions"}</p>}
    {sessions.isError && <p className="field-error">Couldn’t load session count. <button type="button" onClick={() => sessions.refetch()}>Retry</button></p>}
    <fieldset disabled={busy}>
      <label>Current password
        <input type="password" autoComplete="current-password" aria-invalid={!!form.formState.errors.current_password} aria-describedby="security-current-error" {...form.register("current_password")} />
        <small id="security-current-error" className="field-error">{form.formState.errors.current_password?.message}</small>
      </label>
      <label>New password
        <input type="password" autoComplete="new-password" aria-invalid={!!form.formState.errors.password} aria-describedby="security-password-error" {...form.register("password")} />
        <small id="security-password-error" className="field-error">{form.formState.errors.password?.message || "At least 12 characters"}</small>
      </label>
      <label>Confirm new password
        <input type="password" autoComplete="new-password" aria-invalid={!!form.formState.errors.password_confirmation} aria-describedby="security-confirm-error" {...form.register("password_confirmation")} />
        <small id="security-confirm-error" className="field-error">{form.formState.errors.password_confirmation?.message}</small>
      </label>
      <button className="button primary full" type="submit">{form.formState.isSubmitting && <LoaderCircle className="spin" size={18} />} Change password</button>
      <button className="button subtle full" type="button" onClick={revokeOthers}>{revoking && <LoaderCircle className="spin" size={18} />} Sign out other sessions</button>
    </fieldset>
    {error && <p role="alert" className="error-box">{error}</p>}
    {message && <p role="status">{message}</p>}
  </form>;
}
