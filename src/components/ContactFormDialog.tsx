"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, INDUSTRIES, INTERESTS } from "@/lib/constants";

export interface OwnerOption {
  id: string;
  name: string;
}

export interface ContactInitial {
  id?: string;
  firstName?: string;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  source?: string | null;
  stage?: string;
  industry?: string | null;
  interests?: string[];
  dealValue?: number | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export function ContactFormDialog({
  action,
  owners,
  isAdmin,
  initial,
  triggerLabel,
  triggerClass = "btn-primary",
  title,
}: {
  action: (formData: FormData) => Promise<void>;
  owners: OwnerOption[];
  isAdmin: boolean;
  initial?: ContactInitial;
  triggerLabel: string;
  triggerClass?: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await action(formData);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className={triggerClass} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="card my-8 w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form action={onSubmit} className="space-y-4">
              {initial?.id && <input type="hidden" name="id" value={initial.id} />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">First name *</label>
                  <input name="firstName" className="input" required defaultValue={initial?.firstName ?? ""} />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input name="lastName" className="input" defaultValue={initial?.lastName ?? ""} />
                </div>
                <div>
                  <label className="label">Company</label>
                  <input name="company" className="input" defaultValue={initial?.company ?? ""} />
                </div>
                <div>
                  <label className="label">Job title</label>
                  <input name="jobTitle" className="input" defaultValue={initial?.jobTitle ?? ""} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input name="email" type="email" className="input" defaultValue={initial?.email ?? ""} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input name="phone" className="input" defaultValue={initial?.phone ?? ""} />
                </div>
                <div>
                  <label className="label">WhatsApp</label>
                  <input name="whatsapp" className="input" defaultValue={initial?.whatsapp ?? ""} />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input name="website" className="input" defaultValue={initial?.website ?? ""} placeholder="https://…" />
                </div>
                <div>
                  <label className="label">Stage</label>
                  <select name="stage" className="input" defaultValue={initial?.stage ?? "NEW"}>
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select name="industry" className="input" defaultValue={initial?.industry ?? ""}>
                    <option value="">—</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Deal value (AED)</label>
                  <input name="dealValue" type="number" step="any" className="input" defaultValue={initial?.dealValue ?? 0} />
                </div>
                <div>
                  <label className="label">Source</label>
                  <input name="source" className="input" defaultValue={initial?.source ?? ""} placeholder="Website, Referral…" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input name="city" className="input" defaultValue={initial?.city ?? ""} />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input name="country" className="input" defaultValue={initial?.country ?? ""} />
                </div>
                {isAdmin && (
                  <div>
                    <label className="label">Assigned to</label>
                    <select name="ownerId" className="input" defaultValue={initial?.ownerId ?? ""}>
                      <option value="">Unassigned</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <label
                      key={i}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        name="interests"
                        value={i}
                        defaultChecked={initial?.interests?.includes(i) ?? false}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      {i}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea name="notes" className="input min-h-[80px]" defaultValue={initial?.notes ?? ""} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Save contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
