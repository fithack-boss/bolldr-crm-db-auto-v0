import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDashboardData } from "@/lib/stats";
import { StatCard } from "@/components/StatCard";
import { StageBarChart } from "@/components/charts/StageBarChart";
import { ActivityChart } from "@/components/charts/ActivityChart";
import { formatCurrency, relativeTime } from "@/lib/format";
import { interactionIcon, interactionLabel } from "@/lib/constants";
import type { InteractionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  // Admins see team-wide totals; reps see only their own.
  const data = await getDashboardData(isAdmin ? null : user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isAdmin ? "Team Dashboard" : `Welcome back, ${user.name?.split(" ")[0] || user.username}`}
        </h1>
        <p className="text-sm text-slate-500">
          {isAdmin
            ? "Company-wide pipeline and activity across all sales reps."
            : "Your pipeline, activity and logged hours at a glance."}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={isAdmin ? "Total Contacts" : "My Contacts"} value={data.totalContacts} icon="👥" sublabel={`${data.openDeals} open`} />
        <StatCard
          label="Calls Logged"
          value={data.callsLogged}
          icon="📞"
          accent="text-brand-600"
          sublabel={`${data.callsReported} reported in logs`}
        />
        <StatCard
          label="Hours Worked"
          value={data.hoursWorked.toFixed(1)}
          icon="⏱️"
          accent="text-violet-600"
          sublabel="from daily logs"
        />
        <StatCard
          label="Deals Won"
          value={data.wonDeals}
          icon="🏆"
          accent="text-green-600"
          sublabel={formatCurrency(data.wonValue)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard label="Open Pipeline Value" value={formatCurrency(data.pipelineValue)} icon="💰" />
        <StatCard label="Meetings Logged" value={data.meetingsLogged} icon="🤝" />
        <StatCard label="Total Interactions" value={data.totalInteractions} icon="⚡" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Contacts by Pipeline Stage</h2>
          <p className="mb-3 text-xs text-slate-400">How your contacts are distributed across the funnel.</p>
          <StageBarChart data={data.stageBreakdown} />
        </div>
        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Activity — last 14 days</h2>
          <p className="mb-3 text-xs text-slate-400">Calls, emails and meetings logged against contacts.</p>
          <ActivityChart data={data.activityTrend} />
        </div>
      </div>

      {/* Recent interactions */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Recent Interactions</h2>
          <Link href="/contacts" className="text-xs font-medium text-brand-600 hover:underline">
            View all contacts →
          </Link>
        </div>
        {data.recentInteractions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No interactions logged yet. Open a contact and add your first note.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recentInteractions.map((it) => (
              <li key={it.id} className="flex items-start gap-3 py-3">
                <span className="text-lg">{interactionIcon(it.type as InteractionType)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/contacts/${it.contactId}`} className="text-sm font-medium text-slate-800 hover:text-brand-600">
                      {it.contactName}
                    </Link>
                    <span className="badge bg-slate-100 text-slate-500">{interactionLabel(it.type as InteractionType)}</span>
                  </div>
                  <p className="truncate text-sm text-slate-500">{it.body}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  {isAdmin && <div className="text-slate-500">{it.userName}</div>}
                  {relativeTime(it.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
