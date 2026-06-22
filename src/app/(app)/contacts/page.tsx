import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StageBadge } from "@/components/StageBadge";
import { ContactsFilterBar } from "@/components/ContactsFilterBar";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { createContact } from "./actions";
import { formatCurrency, relativeTime } from "@/lib/format";
import type { Prisma, Stage } from "@prisma/client";
import { STAGE_VALUES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string; owner?: string };
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const where: Prisma.ContactWhereInput = {};
  // Reps only ever see their own contacts.
  if (!isAdmin) {
    where.ownerId = user.id;
  } else if (searchParams.owner === "unassigned") {
    where.ownerId = null;
  } else if (searchParams.owner) {
    where.ownerId = searchParams.owner;
  }

  if (searchParams.stage && STAGE_VALUES.includes(searchParams.stage as Stage)) {
    where.stage = searchParams.stage as Stage;
  }

  if (searchParams.q) {
    const q = searchParams.q;
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [contacts, owners, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        owner: { select: { name: true } },
        _count: { select: { interactions: true } },
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { role: { in: ["SALES", "ADMIN"] }, active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.contact.count({ where }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contacts</h1>
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? "contact" : "contacts"}
            {!isAdmin && " assigned to you"}
          </p>
        </div>
        <ContactFormDialog
          action={createContact}
          owners={owners}
          isAdmin={isAdmin}
          triggerLabel="+ New contact"
          title="New contact"
        />
      </div>

      <ContactsFilterBar owners={owners} isAdmin={isAdmin} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Company</th>
                <th className="th">Stage</th>
                <th className="th">Value</th>
                {isAdmin && <th className="th">Owner</th>}
                <th className="th">Activity</th>
                <th className="th">Last contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-sm text-slate-400">
                    No contacts match your filters.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                      </Link>
                      {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                    </td>
                    <td className="td">
                      <div className="text-slate-700">{c.company || "—"}</div>
                      {c.jobTitle && <div className="text-xs text-slate-400">{c.jobTitle}</div>}
                    </td>
                    <td className="td"><StageBadge stage={c.stage} /></td>
                    <td className="td">{formatCurrency(c.dealValue)}</td>
                    {isAdmin && <td className="td">{c.owner?.name ?? <span className="text-slate-400">Unassigned</span>}</td>}
                    <td className="td">{c._count.interactions}</td>
                    <td className="td text-slate-500">{relativeTime(c.lastContactedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
