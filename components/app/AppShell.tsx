"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import clsx from "clsx";
import { useAuth } from "../../lib/authClient";
import { canAccessRoute } from "../../lib/rbac";
import { Button, Input } from "../ui";

const nav = [
  { href: "/app/overview", label: "Dashboard" },
  { href: "/app/students", label: "Students" },
  { href: "/app/homework", label: "Homework" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/settings", label: "Settings" }
];

export function AppShell({ children }:{ children: React.ReactNode }){
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(()=>{
    if (!isLoading && !user) router.replace("/login");
  },[isLoading,user,router]);

  React.useEffect(()=>{
    if (user && !canAccessRoute(user.role, pathname)) router.replace("/app/overview");
  },[user,pathname,router]);

  if (isLoading || !user) {
    return <div className="min-h-screen bg-ink-50" />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/app/overview" className="flex items-center gap-2">
            <img src="/assets/nuvotypeorange.svg" alt="Nuvo" className="h-4" />
          </Link>
          <div className="w-[360px] max-w-[40vw] ml-4 hidden md:block">
            <Input placeholder="Search students, assignments, words…" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-xl2 border border-ink-200 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50" aria-label="Notifications">
              🔔
            </button>
            <div className="flex items-center gap-2 rounded-xl2 border border-ink-200 px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-ink-100 flex items-center justify-center text-xs font-semibold">
                {user.name.split(" ").map(x=>x[0]).slice(0,2).join("")}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold leading-4">{user.name}</div>
                <div className="text-[11px] text-ink-500 leading-4">{user.role.replace("_"," ")}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={()=>{ logout(); router.push("/"); }}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-5">
        <aside className="hidden w-64 shrink-0 md:block">
          <nav className="rounded-xl2 border border-ink-200 bg-white p-2 shadow-subtle">
            {nav.map(i=>(
              <Link key={i.href} href={i.href}
                className={clsx("flex items-center rounded-xl2 px-3 py-2 text-sm font-medium",
                  pathname===i.href ? "bg-nuvo-50 text-nuvo-800" : "text-ink-700 hover:bg-ink-50"
                )}
              >
                {i.label}
              </Link>
            ))}
            {user.role==="CLINIC_ADMIN" ? (
              <Link href="/app/admin" className={clsx("mt-2 flex items-center rounded-xl2 px-3 py-2 text-sm font-medium",
                pathname?.startsWith("/app/admin") ? "bg-nuvo-50 text-nuvo-800" : "text-ink-700 hover:bg-ink-50"
              )}>
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="mt-3 rounded-xl2 border border-ink-200 bg-white p-3 text-sm text-ink-600 shadow-subtle">
            <div className="font-semibold text-ink-900">Welcome checklist</div>
            <ol className="mt-2 space-y-1 list-decimal pl-5">
              <li>Add your first student</li>
              <li>Assign first homework</li>
              <li>View results</li>
            </ol>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
