import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight DB health/diagnostics endpoint.
//
// Visit https://crm.bolldr.com/api/health to see, in plain JSON, whether the
// live database can CONNECT, READ and WRITE — and, if writes are failing, the
// actual error. This turns "my log didn't save / today's entries are missing"
// into a concrete, visible diagnosis without needing server-log access.
//
// Optional: set HEALTH_TOKEN in the environment and call
// /api/health?token=YOUR_TOKEN to keep it private.
export async function GET(req: Request) {
  const required = process.env.HEALTH_TOKEN;
  if (required) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== required) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result: Record<string, unknown> = {
    ok: false,
    checks: { connect: false, read: false, write: false },
    time: new Date().toISOString(),
  };

  // 1. Connect + read
  try {
    await prisma.$queryRaw`SELECT 1`;
    (result.checks as Record<string, boolean>).connect = true;

    const agg = await prisma.dailyLog.aggregate({
      _count: { _all: true },
      _max: { date: true, createdAt: true },
    });
    (result.checks as Record<string, boolean>).read = true;

    // Count today's entries (UTC) so you can see if today's writes landed.
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const todayCount = await prisma.dailyLog.count({
      where: { createdAt: { gte: start, lt: end } },
    });

    result.dailyLogs = {
      total: agg._count._all,
      latestEntryDate: agg._max.date ? agg._max.date.toISOString().slice(0, 10) : null,
      lastWriteAt: agg._max.createdAt ? agg._max.createdAt.toISOString() : null,
      createdTodayUTC: todayCount,
    };
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(result, { status: 503 });
  }

  // 2. Write test — insert a temporary user inside a transaction and roll it
  //    back, so we exercise the write path without leaving any data behind.
  try {
    const nonce = `__healthcheck__${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: `${nonce}@bolldr.local`,
          username: nonce,
          name: "healthcheck",
          passwordHash: "x",
        },
      });
      // Abort so nothing persists.
      throw new Error("__rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message === "__rollback__") {
      (result.checks as Record<string, boolean>).write = true;
    } else {
      result.writeError = err instanceof Error ? err.message : String(err);
      return NextResponse.json(result, { status: 503 });
    }
  }

  result.ok =
    (result.checks as Record<string, boolean>).connect &&
    (result.checks as Record<string, boolean>).read &&
    (result.checks as Record<string, boolean>).write;

  return NextResponse.json(result);
}
