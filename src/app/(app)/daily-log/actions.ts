"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  date: z.string().min(1),
  hoursWorked: z.coerce.number().min(0).max(24),
  callsMade: z.coerce.number().int().min(0),
  meetingsHeld: z.coerce.number().int().min(0),
  emailsSent: z.coerce.number().int().min(0),
  newContacts: z.coerce.number().int().min(0),
  dealsWon: z.coerce.number().int().min(0),
  summary: z.string().optional(),
  blockers: z.string().optional(),
});

// Upsert the rep's standardized daily report. One log per user per day.
export async function submitDailyLog(
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the values and try again." };
  }
  const data = parsed.data;
  const date = new Date(data.date + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime())) {
    return { error: "That date is invalid." };
  }

  try {
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        hoursWorked: data.hoursWorked,
        callsMade: data.callsMade,
        meetingsHeld: data.meetingsHeld,
        emailsSent: data.emailsSent,
        newContacts: data.newContacts,
        dealsWon: data.dealsWon,
        summary: data.summary || null,
        blockers: data.blockers || null,
      },
      update: {
        hoursWorked: data.hoursWorked,
        callsMade: data.callsMade,
        meetingsHeld: data.meetingsHeld,
        emailsSent: data.emailsSent,
        newContacts: data.newContacts,
        dealsWon: data.dealsWon,
        summary: data.summary || null,
        blockers: data.blockers || null,
      },
    });
  } catch (err) {
    // Don't fail silently — surface the write failure to the rep AND to the
    // server logs (Vercel) so a broken DB/connection is visible instead of
    // looking like "my log just didn't save."
    console.error("[daily-log] save failed", { userId: user.id, date: data.date, err });
    return { error: "Couldn't save your log — the server rejected the write. Please try again, and let your admin know if it keeps happening." };
  }

  revalidatePath("/daily-log");
  revalidatePath("/dashboard");
  return { ok: true };
}
