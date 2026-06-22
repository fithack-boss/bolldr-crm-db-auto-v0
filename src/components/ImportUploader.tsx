"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  ok?: boolean;
  error?: string;
  filename?: string;
  rowsTotal?: number;
  mapped?: number;
  created?: number;
  updated?: number;
  skipped?: number;
}

export function ImportUploader({ owners }: { owners: { id: string; name: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [dedupe, setDedupe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    if (ownerId) fd.append("ownerId", ownerId);
    fd.append("dedupe", dedupe ? "on" : "off");

    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.ok) router.refresh();
    } catch {
      setResult({ error: "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">CSV or Excel file</label>
        <input
          type="file"
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
        <p className="mt-1 text-xs text-slate-400">
          The first row must contain column headers. English and Spanish headers are auto-mapped
          (Nombre del Cliente, Industria, Estado de Llamada, Teléfono, Celular, WhatsApp, Página Web,
          Intereses, Notas de Llamada…); unrecognized columns are preserved on each contact.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Assign imported contacts to</label>
          <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Leave unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Update existing contacts matched by email / phone
        </label>
      </div>

      <button type="submit" className="btn-primary" disabled={!file || loading}>
        {loading ? "Importing…" : "Import to master table"}
      </button>

      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
          {result.error ? (
            result.error
          ) : (
            <div>
              <div className="font-semibold">✓ Imported {result.filename}</div>
              <div className="mt-1 text-green-700">
                {result.rowsTotal} rows read · {result.mapped} mapped · {result.created} created · {result.updated} updated
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
