import React, { useState } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, patch } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
} from "../components/ui";
import type { Supplier } from "../lib/types";
export default function Suppliers() {
  const { business } = useAuth(),
    cache = useQueryClient();
  const [q, setQ] = useState(""),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [contact, setContact] = useState(""),
    [selected, setSelected] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const result = useQuery({
    queryKey: ["store", business?.id, "suppliers", q],
    queryFn: () =>
      api<Supplier[]>(
        `suppliers?per_page=100&q=${encodeURIComponent(q)}`,
        {},
        business?.id,
      ),
    enabled: !!business,
  });
  async function save() {
    setBusy(true);
    setError("");
    try {
      const body = { supplier: { name, phone, email, contact_name: contact } };
      await api(
        selected ? `suppliers/${selected}` : "suppliers",
        selected ? patch(body) : post(body),
        business?.id,
      );
      setName("");
      setPhone("");
      setEmail("");
      setContact("");
      setSelected(null);
      await cache.invalidateQueries({
        queryKey: ["store", business?.id, "suppliers"],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Suppliers & restocking" back>
      <Heading title="Keep your shelves ready." />
      <Field label="Search suppliers" value={q} onChangeText={setQ} />
      <Button
        title="Products to restock"
        kind="soft"
        onPress={() => router.push("/restocking")}
      />
      <ErrorBox message={error || result.error?.message} />
      {result.isLoading ? <Loading /> : null}
      {result.data?.data.map((s) => (
        <Card key={s.id}>
          <Label>{s.name}</Label>
          <Label muted>
            {[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ")}
          </Label>
          <Button
            title="View products"
            kind="soft"
            onPress={() => router.push(`/restocking?supplierId=${s.id}`)}
          />
          <Button
            title="Edit supplier"
            kind="soft"
            onPress={() => {
              setSelected(s.id);
              setName(s.name);
              setPhone(s.phone ?? "");
              setEmail(s.email ?? "");
              setContact(s.contact_name ?? "");
            }}
          />
        </Card>
      ))}
      <Card>
        <Heading title={selected ? "Edit supplier" : "Add supplier"} />
        <Field
          label="Supplier name"
          value={name}
          onChangeText={setName}
          maxLength={120}
        />
        <Field
          label="Contact name"
          value={contact}
          onChangeText={setContact}
          maxLength={120}
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button
          title="Save supplier"
          busy={busy}
          disabled={!name.trim()}
          onPress={() => void save()}
        />
      </Card>
    </Screen>
  );
}
