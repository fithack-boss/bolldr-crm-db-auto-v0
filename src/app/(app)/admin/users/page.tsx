import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { toggleUserActive } from "./actions";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { contacts: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team</h1>
          <p className="text-sm text-slate-500">Provision accounts and manage access for your sales team.</p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Member</th>
                <th className="th">Username</th>
                <th className="th">Role</th>
                <th className="th">Contacts</th>
                <th className="th">Joined</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                        {initials(u.name)}
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td">@{u.username}</td>
                  <td className="td">
                    <span className={`badge ${u.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABELS[u.role as Role]}
                    </span>
                  </td>
                  <td className="td">{u._count.contacts}</td>
                  <td className="td text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="td">
                    {u.active ? (
                      <span className="badge bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="badge bg-slate-200 text-slate-500">Disabled</span>
                    )}
                  </td>
                  <td className="td text-right">
                    {u.id !== admin.id && (
                      <form action={toggleUserActive}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" className="text-sm font-medium text-brand-600 hover:underline">
                          {u.active ? "Disable" : "Enable"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Tip: assign contacts to reps from the Contacts page (Edit → Assigned to) or in bulk during CSV import.
      </p>
    </div>
  );
}
