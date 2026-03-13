"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDate } from "@/context/DateContext";

const navIcons = {
  Today: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 18v-6h4v6" />
    </svg>
  ),
  Tasks: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <rect x="3" y="3" width="14" height="14" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10l3 3 5-5" />
    </svg>
  ),
  Record: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <polyline strokeLinecap="round" strokeLinejoin="round" points="2,15 7,9 11,12 18,4" />
      <line x1="2" y1="18" x2="18" y2="18" strokeLinecap="round" />
    </svg>
  ),
  Profile: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="10" cy="7" r="3.5" />
      <path strokeLinecap="round" d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    </svg>
  ),
};

const pulseAiIcon = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <circle cx="10" cy="10" r="8" opacity={0.4} />
    <polyline strokeLinecap="round" strokeLinejoin="round"
      points="4,10 7,10 8.5,6 10,14 11.5,8 13,10 16,10" />
  </svg>
);

const labelStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: "9px",
  letterSpacing: "0.12em",
};

export function BottomNav() {
  const pathname = usePathname();
  const { selectedDate } = useDate();

  // Build tabs with dynamic href for Today (includes date param for dashboard sync)
  const navTabs = [
    { label: "Dash",    href: `/?date=${selectedDate}`, match: "/",         icon: navIcons.Today },
    { label: "Tasks",   href: "/tasks",                  match: "/tasks",    icon: navIcons.Tasks },
    { label: "Record",  href: "/progress",               match: "/progress", icon: navIcons.Record },
    { label: "Profile", href: "/profile",                match: "/profile",  icon: navIcons.Profile },
  ];

  return (
    <>
      {/* Spacer — stays in normal flow so content clears the fixed nav */}
      <div className="h-28 flex-shrink-0" aria-hidden="true" />

      {/* Floating pill nav */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-4 py-2.5 rounded-full"
        style={{
          background: "#0D0D0D",
          border: "1px solid #252525",
          boxShadow: "0 4px 32px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Navigating tabs */}
        {navTabs.map((tab) => {
          const isActive = pathname === tab.match;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-colors ${
                isActive ? "text-[#B8933A]" : "text-[#9A9080] hover:text-[#B8B0A0]"
              }`}
            >
              {tab.icon}
              <span style={labelStyle} className="uppercase">{tab.label}</span>
            </Link>
          );
        })}

        {/* PulseAI — visual placeholder, no navigation */}
        <span
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full text-[#3A3530] cursor-default select-none"
          aria-label="PulseAI — coming soon"
        >
          {pulseAiIcon}
          <span style={labelStyle} className="uppercase">PulseAI</span>
        </span>
      </nav>
    </>
  );
}
