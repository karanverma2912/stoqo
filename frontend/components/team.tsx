"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LoaderCircle, Users } from "lucide-react";

type Member = { id: number; role: string; user: { name: string; email: string }; can_edit: boolean; can_remove: boolean };
type Invitation = { id: number; email: string; role: string; expires_at: string; can_revoke: boolean };
type TeamData = { members: Member[]; invitations: Invitation[]; member_limit: number; role_options: string[] };
type Action = { kind: "role" | "remove" | "revoke"; id: number; name: string; role?: string };
const roleDescriptions: Record<string, string> = {
  staff: "Add products, scan sales and update stock. View their own bills.",
  manager: "Also edit products, view reports and all bills, and process returns.",
  admin: "Also manage staff, managers and plan requests. Only the owner manages admins.",
};

export function Team({ businessId }: { businessId: number }) {
  return <TeamPanel key={businessId} businessId={businessId} />;
}

function TeamPanel({ businessId }: { businessId: number }) {
  const client = useQueryClient();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [action, setAction] = useState<Action | null>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => { if (action) confirmation.current?.focus(); }, [action]);
  const [role, setRole] = useState("staff");
  const [inviteRole, setInviteRole] = useState("staff");
  const team = useQuery({ queryKey: ["team", businessId], queryFn: () => api<TeamData>("team_members", {}, businessId) });
  const data = team.data?.data;
  const used = data ? data.members.length + data.invitations.length : 0;

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["team", businessId] }),
      client.invalidateQueries({ queryKey: ["subscription", businessId] }),
      client.invalidateQueries({ queryKey: ["activities", businessId] }),
    ]);
  }

  async function confirmAction() {
    if (!action || locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const path = action.kind === "revoke" ? `team_invitations/${action.id}` : `team_members/${action.id}`;
      await api(path, action.kind === "role"
        ? { method: "PATCH", body: JSON.stringify({ membership: { role } }) }
        : { method: "DELETE" }, businessId);
      toast.success(action.kind === "role" ? "Role updated" : action.kind === "revoke" ? "Invitation revoked" : "Team access removed");
      setAction(null);
      if (action.kind === "revoke") setLink("");
      await refresh();
    } catch (error) { toast.error((error as Error).message); }
    finally { locked.current = false; setBusy(false); }
  }

  return <section className="settings team-panel">
    <h2><Users size={20} aria-hidden="true" /> Your team</h2>
    <p className="muted">Everyone gets their own login. Removing access keeps their past bills and stock history.</p>
    {team.isPending && <p role="status">Loading your team…</p>}
    {team.error && <p role="alert">{team.error.message} <button type="button" onClick={() => team.refetch()}>Try again</button></p>}
    {data && <>
      <p>{used} / {data.member_limit} users · includes owner and pending invitations</p>
      {used >= data.member_limit && <p className="muted">All seats are in use. Revoke an unused invitation, remove access, or review Plans & usage.</p>}
      {data.members.map(member => <div className="plan-row team-member" key={member.id}>
        <span><strong>{member.user.name}</strong><br />{member.user.email}<br /><small>{member.role}</small></span>
        <div className="team-actions">
          {member.can_edit && <button type="button" className="button subtle" disabled={busy} aria-label={`Change role for ${member.user.name}`} onClick={() => { setAction({ kind: "role", id: member.id, name: member.user.name, role: member.role }); setRole(member.role); }}>Change role</button>}
          {member.can_remove && <button type="button" className="button subtle" disabled={busy} aria-label={`Remove ${member.user.name}`} onClick={() => setAction({ kind: "remove", id: member.id, name: member.user.name })}>Remove</button>}
        </div>
      </div>)}
      {data.invitations.length > 0 && <h3>Pending invitations</h3>}
      {data.invitations.map(invitation => <div className="plan-row team-member" key={invitation.id}>
        <span>{invitation.email}<br /><small>{invitation.role} · expires {new Date(invitation.expires_at).toLocaleDateString()}</small></span>
        {invitation.can_revoke && <button type="button" className="button subtle" disabled={busy} onClick={() => setAction({ kind: "revoke", id: invitation.id, name: invitation.email })}>Revoke</button>}
      </div>)}
      {action && <div className="team-confirm" role="region" aria-label="Confirm team change" tabIndex={-1} ref={confirmation}>
        <h3>{action.kind === "role" ? `Change ${action.name}’s role` : action.kind === "revoke" ? `Revoke invitation for ${action.name}?` : `Remove ${action.name}’s access?`}</h3>
        {action.kind === "role" ? <label>New role<select value={role} disabled={busy} onChange={event => setRole(event.target.value)}>{data.role_options.map(option => <option key={option} value={option}>{option}</option>)}</select><small className="muted">{roleDescriptions[role]}</small></label>
          : <p className="muted">{action.kind === "revoke" ? "This invitation link will stop working and its seat will be released." : "They will lose access to this business. Existing bills and stock history will remain."}</p>}
        <div className="team-actions">
          <button className="button primary" type="button" disabled={busy || (action.kind === "role" && action.role === role)} onClick={confirmAction}>{busy && <LoaderCircle className="spin" size={16} />} Confirm</button>
          <button className="button subtle" type="button" disabled={busy} onClick={() => setAction(null)}>Cancel</button>
        </div>
      </div>}
      <form onSubmit={async event => {
        event.preventDefault();
        if (locked.current) return;
        const form = event.currentTarget;
        const values = new FormData(form);
        locked.current = true; setBusy(true); setLink("");
        try {
          const response = await api<{ token: string }>("team_invitations", { method: "POST", body: JSON.stringify({ invitation: { email: values.get("email"), role: inviteRole } }) }, businessId);
          setLink(`${location.origin}/join#token=${encodeURIComponent(response.data.token)}`);
          form.reset(); setInviteRole("staff");
          await refresh(); toast.success("Invitation ready to share");
        } catch (error) { toast.error((error as Error).message); }
        finally { locked.current = false; setBusy(false); }
      }}>
        <h3>Invite someone</h3>
        <label>Employee email<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>
        <label>Role<select value={inviteRole} onChange={event => setInviteRole(event.target.value)} disabled={busy}>{data.role_options.map(option => <option key={option} value={option}>{option}</option>)}</select><small className="muted">{roleDescriptions[inviteRole]}</small></label>
        <button className="button primary full" disabled={busy || used >= data.member_limit}>{busy ? "Saving…" : "Create invitation"}</button>
      </form>
    </>}
    {link && <div className="team-confirm"><p role="status">Share this link with your employee. Valid for 7 days, for their invited email only. No email was sent automatically.</p><input aria-label="Invitation link" readOnly value={link} onFocus={event => event.target.select()} /><button type="button" className="button subtle" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Copied"); } catch { toast.error("Select and copy the link manually"); } }}>Copy link</button></div>}
  </section>;
}
