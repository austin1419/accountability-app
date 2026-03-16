// ─────────────────────────────────────────────
// getCoachAnalytics — SERVER ONLY
//
// Orchestration layer:
//   fetch roster → compute averages → compute trends
//   → generate insights → generate alerts
//   → hydrate alert state → assemble payload
// ─────────────────────────────────────────────

import "server-only";
import { getCoachDashboard } from "@/lib/supabase/queries/getCoachDashboard";
import type { CoachDashboardPayload } from "@/lib/supabase/queries/getCoachDashboard";

import { computeRosterAverages } from "./computeRosterAverages";
import { computeTrendClients } from "./computeTrendClients";
import { generateCoachInsights } from "./generateCoachInsights";
import { generateAlerts } from "@/lib/coach/alerts/generateAlerts";
import { getAlertStates } from "@/lib/coach/alerts/alertStateQueries";
import type { HydratedAlert } from "@/lib/coach/alerts/types";
import type { CoachAnalyticsPayload } from "./types";

export type { CoachAnalyticsPayload, HydratedAlert, AlertStatus } from "./types";
export type { ComplianceAverages, TrendClient, CoachInsight, InsightAccent } from "./types";

export async function getCoachAnalytics(
  coachId: string,
): Promise<CoachAnalyticsPayload> {
  const dashboard: CoachDashboardPayload = await getCoachDashboard(coachId);
  const { roster_snapshot, alerts: rpcAlerts, counts } = dashboard;

  const thriving = counts.good;
  const atRisk = counts.warning;
  const { critical, total, gone_dark } = counts;
  const flaggedCount = critical + gone_dark;

  const compliance = computeRosterAverages(roster_snapshot);
  const improved = computeTrendClients(roster_snapshot, "improving", 5);
  const declining = computeTrendClients(roster_snapshot, "declining", 5);

  const noJournalTodayCount = roster_snapshot.filter((c) => !c.has_journal_today).length;

  const insights = generateCoachInsights(
    compliance,
    thriving,
    total,
    flaggedCount,
    noJournalTodayCount,
    declining.length,
  );

  // Generate deterministic alerts from roster + analytics signals
  const generatedAlerts = generateAlerts({
    roster: roster_snapshot,
    compliance,
    declining,
  });

  // Merge: RPC alerts take precedence, then generated alerts.
  // Deduplicate by client_id + alert_type so the same signal
  // is not shown twice when the RPC already covers it.
  const seen = new Set<string>();
  for (const a of rpcAlerts) {
    seen.add(`${a.client_id}::${a.alert_type}`);
  }
  const uniqueGenerated = generatedAlerts.filter(
    (a) => !seen.has(`${a.client_id}::${a.alert_type}`),
  );
  const mergedRaw = [...rpcAlerts, ...uniqueGenerated].sort((a, b) => {
    if (a.alert_priority !== b.alert_priority) return a.alert_priority - b.alert_priority;
    return a.client_name.localeCompare(b.client_name);
  });

  // Hydrate with persisted lifecycle state
  const stateMap = await getAlertStates(coachId);

  const alerts: HydratedAlert[] = mergedRaw.map((a) => {
    const key = `${a.client_id}::${a.alert_type}`;
    const state = stateMap.get(key);
    return {
      ...a,
      status: state?.status ?? "new",
      reviewed_at: state?.reviewed_at ?? null,
      resolved_at: state?.resolved_at ?? null,
      coach_note: state?.coach_note ?? null,
      state_id: state?.id ?? null,
      intervention_type: state?.intervention_type ?? null,
      intervention_note: state?.intervention_note ?? null,
      follow_up_date: state?.follow_up_date ?? null,
    };
  });

  return {
    thriving,
    atRisk,
    critical,
    goneDark: gone_dark,
    total,
    compliance,
    flaggedCount,
    improved,
    declining,
    insights,
    alerts,
    noJournalTodayCount,
  };
}
