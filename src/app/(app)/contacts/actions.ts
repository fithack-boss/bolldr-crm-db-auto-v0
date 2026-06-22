"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGE_VALUES } from "@/lib/constants";
import type { Stage, InteractionType } from "@prisma/client";

const stageEnum = z.enum(STAGE_VALUES as [Stage, ...Stage[]]);
const typeEnum = z.enum(["CALL", "EMAIL", "MEETING", "WHATSAPP", "NOTE", "TASK"]);

// Ensure the current user is allowed to touch a given contact.
// Reps may only act on contacts assigned to them; admins on any.
async function assertCanAccess(contactId: string) {
  const user = await requireUser();
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error("Contact not found");
  if (user.role !== "ADMIN" && contact.ownerId !== user.id) {
    throw new Error("You do not have access to this contact");
  }
  return { user, contact };
}

const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  stage: stageEnum.optional(),
  dealValue: z.coerce.number().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
});

export async function createContact(formData: FormData) {
  const user = await requireUser();
  const parsed = createContactSchema.parse(Object.fromEntries(formData));

  // Reps can only create contacts assigned to themselves.
  const ownerId = user.role === "ADMIN" ? parsed.ownerId || null : user.id;

  await prisma.contact.create({
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName || null,
      company: parsed.company || null,
      jobTitle: parsed.jobTitle || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      source: parsed.source || "Manual",
      stage: parsed.stage || "NEW",
      dealValue: parsed.dealValue ?? 0,
      city: parsed.city || null,
      country: parsed.country || null,
      notes: parsed.notes || null,
      ownerId,
    },
  });
  revalidatePath("/contacts");
}

const updateContactSchema = createContactSchema.extend({ id: z.string() });

export async function updateContact(formData: FormData) {
  const data = updateContactSchema.parse(Object.fromEntries(formData));
  const { user } = await assertCanAccess(data.id);

  // Only admins may reassign the owner.
  const ownerId = user.role === "ADMIN" ? data.ownerId || null : undefined;

  await prisma.contact.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName || null,
      company: data.company || null,
      jobTitle: data.jobTitle || null,
      email: data.email || null,
      phone: data.phone || null,
      source: data.source || null,
      stage: data.stage,
      dealValue: data.dealValue ?? 0,
      city: data.city || null,
      country: data.country || null,
      notes: data.notes || null,
      ...(ownerId !== undefined ? { ownerId } : {}),
    },
  });
  revalidatePath(`/contacts/${data.id}`);
  revalidatePath("/contacts");
}

export async function addInteraction(formData: FormData) {
  const schema = z.object({
    contactId: z.string(),
    type: typeEnum,
    body: z.string().min(1, "Note cannot be empty"),
    durationMinutes: z.coerce.number().optional(),
    stageTo: stageEnum.optional().or(z.literal("")),
  });
  const data = schema.parse(Object.fromEntries(formData));
  const { user, contact } = await assertCanAccess(data.contactId);

  const stageChanged = data.stageTo && data.stageTo !== contact.stage;

  await prisma.$transaction(async (tx) => {
    await tx.interaction.create({
      data: {
        contactId: data.contactId,
        userId: user.id,
        type: data.type as InteractionType,
        body: data.body,
        durationMinutes: data.durationMinutes || null,
        stageFrom: stageChanged ? contact.stage : null,
        stageTo: stageChanged ? (data.stageTo as Stage) : null,
      },
    });
    await tx.contact.update({
      where: { id: data.contactId },
      data: {
        lastContactedAt: new Date(),
        ...(stageChanged ? { stage: data.stageTo as Stage } : {}),
      },
    });
  });

  revalidatePath(`/contacts/${data.contactId}`);
  revalidatePath("/dashboard");
}

// Quick stage change from the list/detail without a full interaction.
export async function updateStage(formData: FormData) {
  const schema = z.object({ contactId: z.string(), stage: stageEnum });
  const data = schema.parse(Object.fromEntries(formData));
  const { user, contact } = await assertCanAccess(data.contactId);

  if (data.stage !== contact.stage) {
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({ where: { id: data.contactId }, data: { stage: data.stage } });
      await tx.interaction.create({
        data: {
          contactId: data.contactId,
          userId: user.id,
          type: "NOTE",
          body: `Stage moved to ${data.stage}.`,
          stageFrom: contact.stage,
          stageTo: data.stage,
        },
      });
    });
  }
  revalidatePath(`/contacts/${data.contactId}`);
  revalidatePath("/contacts");
}
