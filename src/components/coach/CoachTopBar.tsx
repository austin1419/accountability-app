"use client";

// ─────────────────────────────────────────────
// CoachTopBar — sticky top bar for coach content area
//
// Pure UI. No data fetching, no Supabase, no context.
// Receives page title from pathname. Sign out moved to sidebar.
// ─────────────────────────────────────────────

import { usePathname } from "next/navigation";

const cinzel = "'Cinzel', serif";

/** Map route prefixes to page titles */
const routeTitles: { match: string; title: string }[] = [
  { match: "/coach/clients/",  title: "Client Detail" },
  { match: "/coach/clients",   title: "Clients" },
  { match: "/coach/analytics", title: "Analytics" },
  { match: "/coach/notes",     title: "Notes" },
  { match: "/coach/reports",   title: "Reports" },
  { match: "/coach",           title: "Dashboard" },
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
      className="sticky top-0 z-30 bg-[#111111] border-b border-[#1E1E1E] flex items-center justify-between"
      style={{ padding: "12px 22px" }}
    >
      <h1
        className="text-[#F4EEE4]"
        style={{ fontFamily: cinzel, fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em" }}
      >
        {title}
      </h1>

      {/* Right side — reserved for future actions */}
      <div className="flex items-center gap-3" />
    </header>
  );
}
