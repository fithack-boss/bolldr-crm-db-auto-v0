"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  username: z.string().min(2, "Username too short"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SALES"]),
});

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }],
    },
  });
  if (existing) return { error: "A user with that email or username already exists." };

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  revalidatePath("/admin/users");
  return {};
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  if (userId === admin.id) return; // don't lock yourself out
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await prisma.user.update({ where: { id: userId }, data: { active: !user.active } });
  revalidatePath("/admin/users");
}

export async function resetPassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const userId = String(formData.get("userId"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true };
}

// Bulk reassign all of one rep's contacts to another (e.g. when someone leaves).
export async function reassignContacts(formData: FormData) {
  await requireAdmin();
  const fromId = String(formData.get("fromId"));
  const toId = String(formData.get("toId")) || null;
  await prisma.contact.updateMany({
    where: { ownerId: fromId },
    data: { ownerId: toId },
  });
  revalidatePath("/admin/users");
  revalidatePath("/contacts");
}
