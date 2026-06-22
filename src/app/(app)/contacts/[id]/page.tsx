import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StageBadge } from "@/components/StageBadge";
import { AddInteractionForm } from "@/components/AddInteractionForm";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { updateContact } from "../actions";
import { formatCurrency, formatDateTime, relativeTime, initials } from "@/lib/format";
import { interactionIcon, interactionLabel, stageLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true } },
      interactions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!contact) notFound();
  // Reps can only view their own contacts.
  if (!isAdmin && contact.ownerId !== user.id) redirect("/contacts");

  const owners = isAdmin
    ? await prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <Link href="/contacts" className="text-sm text-brand-600 hover:underline">← Back to contacts</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-700">
            {initials(fullName)}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{fullName}</h1>
            <p className="text-sm text-slate-500">
              {[contact.jobTitle, contact.company].filter(Boolean).join(" · ") || "No company"}
            </p>
            <div className="mt-2"><StageBadge stage={contact.stage} /></div>
          </div>
        </div>
        <ContactFormDialog
          action={updateContact}
          owners={owners}
          isAdmin={isAdmin}
          triggerLabel="Edit"
          triggerClass="btn-secondary"
          title="Edit contact"
          initial={contact}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Details</h2>
            <dl className="space-y-2 text-sm">
              <Detail label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
              <Detail label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
              <Detail label="Deal value" value={formatCurrency(contact.dealValue)} />
              <Detail label="Source" value={contact.source} />
              <Detail label="Location" value={[contact.city, contact.country].filter(Boolean).join(", ") || null} />
              <Detail label="Owner" value={contact.owner?.name ?? "Unassigned"} />
              <Detail label="Created" value={formatDateTime(contact.createdAt)} />
              <Detail label="Last contact" value={contact.lastContactedAt ? relativeTime(contact.lastContactedAt) : "Never"} />
            </dl>
            {contact.notes && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{contact.notes}</p>
              </div>
            )}
            {contact.extra && Object.keys(contact.extra as object).length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Imported fields</div>
                <dl className="space-y-1 text-sm">
                  {Object.entries(contact.extra as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="text-right text-slate-600">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Right: interactions */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Log an interaction</h2>
            <AddInteractionForm contactId={contact.id} currentStage={stageLabel(contact.stage)} />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Interaction history ({contact.interactions.length})
            </h2>
            {contact.interactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No interactions yet. Log your first call or note above.
              </p>
            ) : (
              <ol className="relative space-y-5 border-l border-slate-200 pl-6">
                {contact.interactions.map((it) => (
                  <li key={it.id} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs ring-1 ring-slate-200">
                      {interactionIcon(it.type)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{interactionLabel(it.type)}</span>
                      {it.durationMinutes ? (
                        <span className="badge bg-slate-100 text-slate-500">{it.durationMinutes} min</span>
                      ) : null}
                      {it.stageTo && it.stageFrom && (
                        <span className="badge bg-brand-50 text-brand-600">
                          {stageLabel(it.stageFrom)} → {stageLabel(it.stageTo)}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">{formatDateTime(it.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{it.body}</p>
                    <p className="mt-1 text-xs text-slate-400">by {it.user.name}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">
        {value ? (
          href ? (
            <a href={href} className="text-brand-600 hover:underline">{value}</a>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
