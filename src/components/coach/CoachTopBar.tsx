"use client";

// ─────────────────────────────────────────────
// CoachTopBar — sticky top bar for coach content area
//
// Pure UI. No data fetching, no Supabase, no context.
// Receives page title from pathname.
// ─────────────────────────────────────────────

import { usePathname } from "next/navigation";

const cinzel = "'Cinzel', serif";

/** Map route prefixes to page titles */
const routeTitles: { match: string; title: string }[] = [
  { match: "/coach/clients/",    title: "Client Detail" },
  { match: "/coach/clients",     title: "Clients" },
  { match: "/coach/analytics",   title: "Analytics" },
  { match: "/coach/alerts",      title: "Coach Alerts" },
  { match: "/coach/notes",       title: "Notes" },
  { match: "/coach/reports",     title: "Reports" },
  { match: "/coach/dashboard",   title: "War Room" },
  { match: "/coach",             title: "War Room" },
];

function deriveTitle(pathname: string): string {
  for (const route of routeTitles) {
    if (pathname.startsWith(route.match)) return route.title;
  }
  return "Dashboard";
}

export function CoachTopBar() {
  const pathname = usePathname();
  const title = deriveTitle(pathname);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between"
      style={{ background: "#080808", borderBottom: "1px solid #111111", padding: "9px 20px" }}
    >
      <h1
        className="text-[#F4EEE4] uppercase"
        style={{ fontFamily: cinzel, fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em" }}
      >
        {title}
      </h1>

      {/* Right side — reserved for future actions */}
      <div className="flex items-center gap-3" />
    </header>
  );
}
