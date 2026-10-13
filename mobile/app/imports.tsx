import React, { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Button,
  Card,
  ErrorBox,
  Heading,
  Label,
  Screen,
} from "../components/ui";
type ImportRecord = {
  id: number;
  status: string;
  imported_count: number;
  row_errors: { row?: number; message?: string; error?: string }[];
};
export default function Imports() {
  const { business } = useAuth(),
    cache = useQueryClient(),
    [id, setId] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const status = useQuery({
    queryKey: ["store", business?.id, "import", id],
    queryFn: () => api<ImportRecord>(`imports/${id}`, {}, business?.id),
    enabled: !!id && !!business,
    refetchInterval: (query) =>
      ["pending", "processing"].includes(query.state.data?.data.status ?? "")
        ? 2500
        : false,
  });
  async function upload() {
    setBusy(true);
    setError("");
    try {
      const file = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/csv",
        ],
        copyToCacheDirectory: true,
      });
      if (file.canceled) return;
      const asset = file.assets[0];
      if (
        !/\.(csv|xlsx)$/i.test(asset.name) ||
        (asset.size ?? 0) > 5 * 1024 * 1024
      )
        throw new Error("Choose a CSV or XLSX file under 5 MB.");
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "text/csv",
      } as unknown as Blob);
      const record = await api<ImportRecord>(
        "imports",
        { method: "POST", body: form },
        business?.id,
      );
      setId(record.data.id);
      await cache.invalidateQueries({
        queryKey: ["store", business?.id, "products"],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Import inventory" back>
      <Heading title="Bring your products along." />
      <Card>
        <Label>
          Upload a CSV or Excel sheet with Product Name, SKU, Barcode, Purchase
          Price, Selling Price, Quantity, Low Stock Threshold, Category, Size
          and Color.
        </Label>
        <Label muted>
          Maximum 5 MB and 5,000 rows. Review your file before importing; each
          valid row adds a product and its opening stock.
        </Label>
        <Button title="Choose file" busy={busy} onPress={() => void upload()} />
      </Card>
      <ErrorBox message={error || status.error?.message} />
      {status.data && (
        <Card>
          <Label>{`Status: ${status.data.data.status}`}</Label>
          <Label>{`${status.data.data.imported_count} products imported`}</Label>
          {status.data.data.row_errors.map((row, index) => (
            <Label
              key={index}
            >{`Row ${row.row ?? index + 1}: ${row.message ?? row.error ?? JSON.stringify(row)}`}</Label>
          ))}
        </Card>
      )}
    </Screen>
  );
}
