"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { INTERACTION_TYPES, STAGES } from "@/lib/constants";
import { addInteraction } from "@/app/(app)/contacts/actions";

export function AddInteractionForm({
  contactId,
  currentStage,
}: {
  contactId: string;
  currentStage: string;
}) {
  const [type, setType] = useState("CALL");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const showDuration = type === "CALL" || type === "MEETING";

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await addInteraction(formData);
      formRef.current?.reset();
      setType("CALL");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <input type="hidden" name="contactId" value={contactId} />

      <div className="flex flex-wrap gap-2">
        {INTERACTION_TYPES.map((t) => (
          <label
            key={t.value}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition ${
              type === t.value
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t.value}
              className="hidden"
              checked={type === t.value}
              onChange={() => setType(t.value)}
            />
            {t.icon} {t.label}
          </label>
        ))}
      </div>

      <textarea
        name="body"
        required
        placeholder="Log what happened — what was discussed, next steps, objections…"
        className="input min-h-[90px]"
      />

      <div className="flex flex-wrap items-end gap-3">
        {showDuration && (
          <div>
            <label className="label">Duration (min)</label>
            <input name="durationMinutes" type="number" min="0" className="input w-28" placeholder="15" />
          </div>
        )}
        <div>
          <label className="label">Move to stage</label>
          <select name="stageTo" className="input w-48" defaultValue="">
            <option value="">— keep {currentStage} —</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary ml-auto" disabled={submitting}>
          {submitting ? "Logging…" : "Log interaction"}
        </button>
      </div>
    </form>
  );
}
