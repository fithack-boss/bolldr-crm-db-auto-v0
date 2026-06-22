import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Self-registration configuration & logic.
//
// Anyone can create their own account from /register, but two guard rails apply:
//   1. ADMIN_EMAIL is always granted the ADMIN role on sign-up.
//   2. Sign-ups are limited to ALLOWED_SIGNUP_DOMAINS (so random people on the
//      internet can't create accounts on your CRM). Set it to "" to allow any
//      domain.

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "jadabboud@bolldr.com").toLowerCase();

export const ALLOWED_SIGNUP_DOMAINS = (process.env.ALLOWED_SIGNUP_DOMAINS ?? "bolldr.com,fithack.ae")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isEmailAllowed(email: string): boolean {
  if (ALLOWED_SIGNUP_DOMAINS.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return ALLOWED_SIGNUP_DOMAINS.includes(domain);
}

// Derive a unique, URL-safe username from the email local-part.
async function uniqueUsername(base: string): Promise<string> {
  const root = base.replace(/[^a-z0-9._-]/g, "") || "user";
  let candidate = root;
  let n = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${root}${n}`;
  }
  return candidate;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  ok?: boolean;
  error?: string;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";

  if (name.length < 2) return { error: "Please enter your full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!isEmailAllowed(email)) {
    return {
      error: `Sign-ups are limited to ${ALLOWED_SIGNUP_DOMAINS.join(", ")} email addresses. Ask your administrator to create an account for you.`,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists — try signing in instead." };

  const role = email === ADMIN_EMAIL ? "ADMIN" : "SALES";
  const username = await uniqueUsername(email.split("@")[0]);

  await prisma.user.create({
    data: {
      name,
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  return { ok: true };
}
