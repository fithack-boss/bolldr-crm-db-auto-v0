import { NextResponse } from "next/server";
import { registerUser } from "@/lib/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: create a new account (self-registration). The actual sign-in
// happens client-side via NextAuth after a successful create.
export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await registerUser({
    name: body?.name ?? "",
    email: body?.email ?? "",
    password: body?.password ?? "",
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
