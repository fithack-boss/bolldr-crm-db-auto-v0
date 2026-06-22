"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { STAGES } from "@/lib/constants";

export function ContactsFilterBar({
  owners,
  isAdmin,
}: {
  owners: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/contacts?${next.toString()}`);
    },
    [params, router]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="input max-w-xs"
        placeholder="Search name, company, email…"
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          // debounce-lite: push on each change is fine for small datasets
          setParam("q", v);
        }}
      />
      <select
        className="input max-w-[180px]"
        value={params.get("stage") ?? ""}
        onChange={(e) => setParam("stage", e.target.value)}
      >
        <option value="">All stages</option>
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {isAdmin && (
        <select
          className="input max-w-[180px]"
          value={params.get("owner") ?? ""}
          onChange={(e) => setParam("owner", e.target.value)}
        >
          <option value="">All owners</option>
          <option value="unassigned">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
