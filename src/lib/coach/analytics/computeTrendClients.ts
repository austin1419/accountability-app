// ─────────────────────────────────────────────
// computeTrendClients — rank improving vs declining clients
// ─────────────────────────────────────────────

import type { RosterClient } from "@/lib/supabase/queries/getCoachDashboard";
import type { TrendClient } from "./types";

export function computeTrendClients(
  roster: RosterClient[],
  direction: "improving" | "declining",
  limit: number,
): TrendClient[] {
  const filtered = direction === "improving"
    ? roster.filter((c) => c.seven_day_pct > c.thirty_day_pct)
    : roster.filter((c) => c.seven_day_pct < c.thirty_day_pct);

  const sorted = filtered.sort((a, b) => {
    const deltaA = a.seven_day_pct - a.thirty_day_pct;
    const deltaB = b.seven_day_pct - b.thirty_day_pct;
    return direction === "improving" ? deltaB - deltaA : deltaA - deltaB;
  });

  return sorted.slice(0, limit).map((c) => ({
    id: c.client_id,
    name: c.client_name,
    thirtyDayPct: c.thirty_day_pct,
    delta: c.seven_day_pct - c.thirty_day_pct,
  }));
}
