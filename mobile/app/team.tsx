import React, { useState } from "react";
import { Share } from "react-native";
import * as Linking from "expo-linking";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, patch, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Loading,
  Pill,
  Row,
  Screen,
  confirm,
} from "../components/ui";
type TeamResponse = {
  members: {
    id: number;
    role: string;
    user: { name: string; email: string };
    can_edit: boolean;
    can_remove: boolean;
  }[];
  invitations: {
    id: number;
    email: string;
    role: string;
    email_status: string;
    can_revoke: boolean;
    expires_at: string;
  }[];
  role_options: string[];
  member_limit: number;
};
export default function Team() {
  const { business } = useAuth(),
    cache = useQueryClient(),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("staff"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const result = useQuery({
    queryKey: ["store", business?.id, "team"],
    queryFn: () => api<TeamResponse>("team_members", {}, business?.id),
    enabled: !!business,
  });
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await cache.invalidateQueries({
        queryKey: ["store", business?.id, "team"],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function invite() {
    await run(async () => {
      const r = await api<{
        email_status: string;
        token: string;
        email: string;
      }>(
        "team_invitations",
        post({ invitation: { email, role } }),
        business?.id,
      );
      setEmail("");
      if (r.data.email_status === "queued")
        setNotice(
          "Invitation email queued. Your teammate can open it and join immediately.",
        );
      else {
        setNotice(
          "Email delivery is not connected yet. Share this invitation link.",
        );
        await Share.share({
          message: `Join ${business?.name} on Stoqo: ${Linking.createURL("join")}#token=${r.data.token}`,
        });
      }
    });
  }
  return (
    <Screen title="Your team" back>
      <Heading
        title="Better together."
        description="Each person gets their own login and permissions."
      />
      <ErrorBox message={result.error?.message || error} />
      {notice && <Label>{notice}</Label>}
      {result.isLoading ? <Loading /> : null}
      {result.data && (
        <>
          <Card>
            <Label>{`${result.data.data.members.length} members · ${result.data.data.member_limit} seats`}</Label>
            <Field
              label="Employee email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
            />
            <Row>
              {result.data.data.role_options.map((r) => (
                <Pill
                  key={r}
                  label={r}
                  active={role === r}
                  onPress={() => setRole(r)}
                />
              ))}
            </Row>
            <Button
              title="Send invitation"
              busy={busy}
              disabled={!email.trim()}
              onPress={() => void invite()}
            />
          </Card>
          {result.data.data.members.map((member) => (
            <Card key={member.id}>
              <Label>{member.user.name}</Label>
              <Label muted>{member.user.email}</Label>
              <Row>
                {member.can_edit ? (
                  result.data.data.role_options.map((r) => (
                    <Pill
                      key={r}
                      label={r}
                      active={member.role === r}
                      onPress={() =>
                        confirm(
                          "Change role?",
                          `${member.user.name} will become ${r}.`,
                          () =>
                            void run(async () => {
                              await api(
                                `team_members/${member.id}`,
                                patch({ membership: { role: r } }),
                                business?.id,
                              );
                            }),
                        )
                      }
                    />
                  ))
                ) : (
                  <Pill label={member.role} />
                )}
              </Row>
              {member.can_remove && (
                <Button
                  title="Remove access"
                  kind="danger"
                  disabled={busy}
                  onPress={() =>
                    confirm(
                      "Remove this employee?",
                      `${member.user.name} will lose access to this store immediately. Their past sales remain in history.`,
                      () =>
                        void run(async () => {
                          await api(
                            `team_members/${member.id}`,
                            { method: "DELETE" },
                            business?.id,
                          );
                        }),
                      true,
                    )
                  }
                />
              )}
            </Card>
          ))}
          <Heading title="Pending invitations" />
          {result.data.data.invitations.map((invitation) => (
            <Card key={invitation.id}>
              <Label>{invitation.email}</Label>
              <Label
                muted
              >{`${invitation.role} · Email: ${invitation.email_status} · expires ${new Date(invitation.expires_at).toLocaleDateString()}`}</Label>
              {invitation.can_revoke && (
                <Button
                  title="Revoke invitation"
                  kind="soft"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await api(
                        `team_invitations/${invitation.id}`,
                        { method: "DELETE" },
                        business?.id,
                      );
                    })
                  }
                />
              )}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
