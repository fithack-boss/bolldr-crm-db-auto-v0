import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";

// Layout for all authenticated pages: enforces login and renders the sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
