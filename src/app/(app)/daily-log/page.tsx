import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DailyLogForm } from "@/components/DailyLogForm";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DailyLogPage() {
  const user = await requireUser();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [todayLog, history] = await Promise.all([
    prisma.dailyLog.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    }),
    prisma.dailyLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const existing = todayLog
    ? {
        date: todayLog.date.toISOString().slice(0, 10),
        hoursWorked: todayLog.hoursWorked,
        callsMade: todayLog.callsMade,
        meetingsHeld: todayLog.meetingsHeld,
        emailsSent: todayLog.emailsSent,
        newContacts: todayLog.newContacts,
        dealsWon: todayLog.dealsWon,
        summary: todayLog.summary,
        blockers: todayLog.blockers,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Daily Log</h1>
        <p className="text-sm text-slate-500">
          Submit your standardized end-of-day report. This feeds your dashboard and the team analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              {existing ? "Edit today's log" : "Today's report"}
            </h2>
            <DailyLogForm existing={existing} />
          </div>
        </div>

        <div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent logs</h2>
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No logs submitted yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((log) => (
                  <li key={log.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{formatDate(log.date)}</span>
                      <span className="text-xs text-slate-400">{log.hoursWorked}h</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>📞 {log.callsMade} calls</span>
                      <span>🤝 {log.meetingsHeld} mtgs</span>
                      <span>✉️ {log.emailsSent} emails</span>
                      {log.dealsWon > 0 && <span className="text-green-600">🏆 {log.dealsWon} won</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
