"use client";
// ↑ "use client" is required because this component reads the current URL
// using usePathname(), which is a browser-only feature.

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each tab has a label, a URL path, and an SVG outline icon
const tabs = [
  {
    label: "Today",
    href: "/",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 18v-6h4v6" />
      </svg>
    ),
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <rect x="3" y="3" width="14" height="14" rx="1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 10l3 3 5-5" />
      </svg>
    ),
  },
  {
    label: "Record",
    href: "/progress",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <polyline strokeLinecap="round" strokeLinejoin="round" points="2,15 7,9 11,12 18,4" />
        <line x1="2" y1="18" x2="18" y2="18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <circle cx="10" cy="7" r="3.5" />
        <path strokeLinecap="round" d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
      </svg>
    ),
  },
];

export function BottomNav() {
  // usePathname() returns the current URL path, e.g. "/tasks"
  const pathname = usePathname();

  return (
    <nav className="bg-[#0D0D0D] border-t border-[#252525] flex items-center justify-around py-3 px-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
              isActive ? "text-[#B8933A]" : "text-[#9A9080] hover:text-[#B8B0A0]"
            }`}
          >
            {tab.icon}
            <span
              style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.12em" }}
              className="uppercase"
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
