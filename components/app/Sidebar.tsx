"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/app/overview", label: "Dashboard" },
  { href: "/app/students", label: "Students" },
  { href: "/app/homework", label: "Homework" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="nuvo-sidebar" aria-label="Primary navigation">
      <div className="nuvo-sidebar__inner">
        <div className="nuvo-sidebar__brand">
          <img src="/assets/nuvotypeorange.svg" alt="Nuvo" className="nuvo-sidebar__logo" />
        </div>

        <nav className="nuvo-nav">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nuvo-nav__item nuvo-nav__item--active" : "nuvo-nav__item"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
