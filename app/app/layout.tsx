"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/authClient";
import clsx from "clsx";

const NAV = [
  { href: "/app/overview", label: "Dashboard", icon: "/assets/dashboardicon.png" },
  { href: "/app/students", label: "Students", icon: "/assets/clienticon.png" },
  { href: "/app/calendar", label: "Calendar", icon: "/assets/Calendar.png" },
  { href: "/app/reports", label: "Reports", icon: "/assets/reportsicon.png" },
  { href: "/app/settings", label: "Settings", icon: "/assets/settingsicon.png" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return null;

  return (
    <div className="nuvo-shell">
      <div className="nuvo-main">
        <header className="nuvo-topbar">
          <div className="nuvo-topbar__left">
            <Link className="nuvo-brand" href="/app/overview" aria-label="Nuvo">
              <img src="/assets/nuvotypeorange.svg" alt="Nuvo" className="h-4 w-auto" />
            </Link>
          </div>

          <nav
            className="mx-4 flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap"
            aria-label="Primary navigation"
          >
            {NAV.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-xl2 px-3 py-1.5 text-sm font-medium transition inline-flex items-center gap-1.5",
                    active ? "bg-white text-black shadow-sm" : "text-black/75 hover:bg-white/70"
                  )}
                >
                  {item.icon ? <img src={item.icon} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" /> : null}
                  {item.label}
                </Link>
              );
            })}
            {user.role === "CLINIC_ADMIN" ? (
              <Link
                href="/app/admin"
                className={clsx(
                  "rounded-xl2 px-3 py-1.5 text-sm font-medium transition",
                  pathname?.startsWith("/app/admin")
                    ? "bg-white text-black shadow-sm"
                    : "text-black/75 hover:bg-white/70"
                )}
              >
                Admin
              </Link>
            ) : null}
          </nav>

        </header>

        <main className="nuvo-content">{children}</main>
      </div>
    </div>
  );
}
