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
export async function submitDailyLog(formData: FormData) {
  const user = await requireUser();
  const data = schema.parse(Object.fromEntries(formData));
  const date = new Date(data.date + "T00:00:00.000Z");

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

  revalidatePath("/daily-log");
  revalidatePath("/dashboard");
}
