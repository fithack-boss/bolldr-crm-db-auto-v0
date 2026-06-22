import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Entry point: send authenticated users to their dashboard, everyone else to login.
export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");
  redirect("/login");
}
