import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getDashboardData, getTeamLeaderboard } from "@/lib/stats";
import { StatCard } from "@/components/StatCard";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamOverviewPage() {
  await requireAdmin();
  const [data, leaderboard] = await Promise.all([
    getDashboardData(null),
    getTeamLeaderboard(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Team Analytics</h1>
        <p className="text-sm text-slate-500">
          Company-wide performance from the master CRM and submitted daily logs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Contacts" value={data.totalContacts} icon="👥" />
        <StatCard label="Calls Logged" value={data.callsLogged} icon="📞" accent="text-brand-600" />
        <StatCard label="Team Hours" value={data.hoursWorked.toFixed(0)} icon="⏱️" accent="text-violet-600" sublabel="from daily logs" />
        <StatCard label="Won Value" value={formatCurrency(data.wonValue)} icon="🏆" accent="text-green-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Sales rep leaderboard</h2>
          <p className="text-xs text-slate-400">
            Calls come from logged interactions; hours and reported calls come from daily logs.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Rep</th>
                <th className="th">Contacts</th>
                <th className="th">Won</th>
                <th className="th">Calls logged</th>
                <th className="th">Interactions</th>
                <th className="th">Hours (logs)</th>
                <th className="th">Calls (logs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">No sales reps yet.</td></tr>
              ) : (
                leaderboard.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{r.name}</td>
                    <td className="td">{r.contacts}</td>
                    <td className="td text-green-600">{r.won}</td>
                    <td className="td text-brand-600">{r.calls}</td>
                    <td className="td">{r.interactions}</td>
                    <td className="td">{r.hoursWorked.toFixed(1)}</td>
                    <td className="td">{r.callsReported}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Looking for a single rep's pipeline? Open <Link href="/contacts" className="text-brand-600 hover:underline">Contacts</Link> and filter by owner.
      </p>
    </div>
  );
}
