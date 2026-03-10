"use client";
// ↑ "use client" is required because this component reads the current URL
// using usePathname(), which is a browser-only feature.

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each tab has a label, a URL path, and an icon (using simple Unicode symbols for now)
const tabs = [
  { label: "Dashboard",      href: "/",               icon: "⊞" },
  { label: "Tasks",          href: "/tasks",           icon: "✓" },
  { label: "Progress",       href: "/progress",        icon: "↗" },
  { label: "Accountability", href: "/accountability",  icon: "⬡" },
];

export function BottomNav() {
  // usePathname() returns the current URL path, e.g. "/tasks"
  const pathname = usePathname();

  return (
    <nav className="bg-white border-t border-gray-100 flex items-center justify-around py-3 px-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center gap-1 text-xs font-medium min-w-[60px] transition-colors ${
              isActive ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
