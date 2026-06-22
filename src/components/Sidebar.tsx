"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { initials } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/daily-log", label: "Daily Log", icon: "📝" },
  { href: "/admin/import", label: "Import Data", icon: "⬆️", adminOnly: true },
  { href: "/admin/users", label: "Team", icon: "🧑‍💼", adminOnly: true },
  { href: "/admin/overview", label: "Team Analytics", icon: "📈", adminOnly: true },
];

export function Sidebar({
  user,
}: {
  user: { name?: string | null; role: string; username: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">B</span>
          Bolldr CRM
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-secondary px-2 py-1" aria-label="Toggle menu">
          ☰
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:block md:h-screen md:w-64`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2 px-5 py-5 md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-base font-black text-white">B</span>
            <span className="text-lg font-bold text-slate-800">Bolldr CRM</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(user.name || user.username)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{user.name || user.username}</div>
                <div className="text-xs capitalize text-slate-400">{user.role.toLowerCase()}</div>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-secondary w-full">
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
