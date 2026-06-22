"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitDailyLog } from "@/app/(app)/daily-log/actions";
import { todayISODate } from "@/lib/format";

export interface DailyLogValues {
  date: string;
  hoursWorked: number;
  callsMade: number;
  meetingsHeld: number;
  emailsSent: number;
  newContacts: number;
  dealsWon: number;
  summary?: string | null;
  blockers?: string | null;
}

export function DailyLogForm({ existing }: { existing?: DailyLogValues | null }) {
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    setSaved(false);
    try {
      await submitDailyLog(formData);
      setSaved(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Date</label>
          <input name="date" type="date" className="input" required defaultValue={existing?.date ?? todayISODate()} />
        </div>
        <Num name="hoursWorked" label="Hours worked" step="0.5" value={existing?.hoursWorked} />
        <Num name="callsMade" label="Calls made" value={existing?.callsMade} />
        <Num name="meetingsHeld" label="Meetings held" value={existing?.meetingsHeld} />
        <Num name="emailsSent" label="Emails sent" value={existing?.emailsSent} />
        <Num name="newContacts" label="New contacts" value={existing?.newContacts} />
        <Num name="dealsWon" label="Deals won" value={existing?.dealsWon} />
      </div>

      <div>
        <label className="label">What did you work on today?</label>
        <textarea
          name="summary"
          className="input min-h-[100px]"
          placeholder="Key activities, deals advanced, demos booked…"
          defaultValue={existing?.summary ?? ""}
        />
      </div>
      <div>
        <label className="label">Blockers / help needed</label>
        <textarea
          name="blockers"
          className="input min-h-[60px]"
          placeholder="Anything slowing you down?"
          defaultValue={existing?.blockers ?? ""}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : existing ? "Update log" : "Submit daily log"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </form>
  );
}

function Num({
  name,
  label,
  value,
  step,
}: {
  name: string;
  label: string;
  value?: number;
  step?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        step={step ?? "1"}
        className="input"
        defaultValue={value ?? 0}
      />
    </div>
  );
}
