import { prisma } from "@/lib/prisma";
import { STAGES } from "@/lib/constants";
import type { Stage } from "@prisma/client";

// Aggregates that power the dashboards. When `userId` is null we aggregate
// across the whole team (admin view); otherwise we scope to a single rep.

export interface DashboardData {
  totalContacts: number;
  openDeals: number;
  wonDeals: number;
  pipelineValue: number;
  wonValue: number;
  stageBreakdown: { stage: Stage; label: string; color: string; count: number }[];
  // Interaction-derived (real-time logging)
  callsLogged: number;
  meetingsLogged: number;
  totalInteractions: number;
  // Daily-log-derived (self-reported)
  hoursWorked: number;
  callsReported: number;
  newContactsReported: number;
  // 14-day activity trend from interactions
  activityTrend: { date: string; calls: number; emails: number; meetings: number; total: number }[];
  recentInteractions: {
    id: string;
    type: string;
    body: string;
    createdAt: Date;
    contactName: string;
    contactId: string;
    userName: string;
  }[];
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData(userId: string | null): Promise<DashboardData> {
  const contactWhere = userId ? { ownerId: userId } : {};
  const interactionWhere = userId ? { userId } : {};
  const logWhere = userId ? { userId } : {};

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 13);
  since.setUTCHours(0, 0, 0, 0);

  const [
    totalContacts,
    stageGroups,
    valueAgg,
    wonAgg,
    callsLogged,
    meetingsLogged,
    totalInteractions,
    logAgg,
    trendInteractions,
    recent,
  ] = await Promise.all([
    prisma.contact.count({ where: contactWhere }),
    prisma.contact.groupBy({
      by: ["stage"],
      where: contactWhere,
      _count: { _all: true },
    }),
    prisma.contact.aggregate({
      where: { ...contactWhere, stage: { notIn: ["WON", "LOST"] } },
      _sum: { dealValue: true },
    }),
    prisma.contact.aggregate({
      where: { ...contactWhere, stage: "WON" },
      _sum: { dealValue: true },
    }),
    prisma.interaction.count({ where: { ...interactionWhere, type: "CALL" } }),
    prisma.interaction.count({ where: { ...interactionWhere, type: "MEETING" } }),
    prisma.interaction.count({ where: interactionWhere }),
    prisma.dailyLog.aggregate({
      where: logWhere,
      _sum: { hoursWorked: true, callsMade: true, newContacts: true },
    }),
    prisma.interaction.findMany({
      where: { ...interactionWhere, createdAt: { gte: since } },
      select: { type: true, createdAt: true },
    }),
    prisma.interaction.findMany({
      where: interactionWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const countByStage = new Map<string, number>();
  for (const g of stageGroups) countByStage.set(g.stage, g._count._all);

  const stageBreakdown = STAGES.map((s) => ({
    stage: s.value,
    label: s.label,
    color: s.color,
    count: countByStage.get(s.value) ?? 0,
  }));

  const wonDeals = countByStage.get("WON") ?? 0;
  const lostDeals = countByStage.get("LOST") ?? 0;
  const openDeals = totalContacts - wonDeals - lostDeals;

  // Build a 14-day trend with zero-filled days.
  const trendMap = new Map<string, { calls: number; emails: number; meetings: number; total: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    trendMap.set(dayKey(d), { calls: 0, emails: 0, meetings: 0, total: 0 });
  }
  for (const it of trendInteractions) {
    const key = dayKey(it.createdAt);
    const bucket = trendMap.get(key);
    if (!bucket) continue;
    bucket.total++;
    if (it.type === "CALL") bucket.calls++;
    else if (it.type === "EMAIL") bucket.emails++;
    else if (it.type === "MEETING") bucket.meetings++;
  }
  const activityTrend = Array.from(trendMap.entries()).map(([date, v]) => ({
    date: date.slice(5), // MM-DD
    ...v,
  }));

  return {
    totalContacts,
    openDeals,
    wonDeals,
    pipelineValue: valueAgg._sum.dealValue ?? 0,
    wonValue: wonAgg._sum.dealValue ?? 0,
    stageBreakdown,
    callsLogged,
    meetingsLogged,
    totalInteractions,
    hoursWorked: logAgg._sum.hoursWorked ?? 0,
    callsReported: logAgg._sum.callsMade ?? 0,
    newContactsReported: logAgg._sum.newContacts ?? 0,
    activityTrend,
    recentInteractions: recent.map((r) => ({
      id: r.id,
      type: r.type,
      body: r.body,
      createdAt: r.createdAt,
      contactName: [r.contact.firstName, r.contact.lastName].filter(Boolean).join(" "),
      contactId: r.contact.id,
      userName: r.user.name,
    })),
  };
}

// Per-rep leaderboard for the admin team analytics page.
export async function getTeamLeaderboard() {
  const reps = await prisma.user.findMany({
    where: { role: "SALES" },
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    reps.map(async (rep) => {
      const [contacts, won, calls, interactions, logAgg] = await Promise.all([
        prisma.contact.count({ where: { ownerId: rep.id } }),
        prisma.contact.count({ where: { ownerId: rep.id, stage: "WON" } }),
        prisma.interaction.count({ where: { userId: rep.id, type: "CALL" } }),
        prisma.interaction.count({ where: { userId: rep.id } }),
        prisma.dailyLog.aggregate({
          where: { userId: rep.id },
          _sum: { hoursWorked: true, callsMade: true },
        }),
      ]);
      return {
        id: rep.id,
        name: rep.name,
        username: rep.username,
        contacts,
        won,
        calls,
        interactions,
        hoursWorked: logAgg._sum.hoursWorked ?? 0,
        callsReported: logAgg._sum.callsMade ?? 0,
      };
    })
  );

  return rows;
}
