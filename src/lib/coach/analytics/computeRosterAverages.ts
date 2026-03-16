// ─────────────────────────────────────────────
// computeRosterAverages — roster-level compliance averages
// ─────────────────────────────────────────────

import type { RosterClient } from "@/lib/supabase/queries/getCoachDashboard";
import type { ComplianceAverages } from "./types";

function avgPct(clients: RosterClient[], key: "today_pct" | "seven_day_pct" | "thirty_day_pct"): number {
  if (clients.length === 0) return 0;
  const sum = clients.reduce((acc, c) => acc + (c[key] ?? 0), 0);
  return Math.round(sum / clients.length);
}

export function computeRosterAverages(roster: RosterClient[]): ComplianceAverages {
  return {
    today: avgPct(roster, "today_pct"),
    sevenDay: avgPct(roster, "seven_day_pct"),
    thirtyDay: avgPct(roster, "thirty_day_pct"),
  };
}
