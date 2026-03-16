// ─────────────────────────────────────────────
// Coach Analytics — shared types
// ─────────────────────────────────────────────

import type { HydratedAlert } from "@/lib/coach/alerts/types";

export type { HydratedAlert } from "@/lib/coach/alerts/types";
export type { AlertStatus } from "@/lib/coach/alerts/types";

export interface ComplianceAverages {
  today: number;
  sevenDay: number;
  thirtyDay: number;
}

export interface TrendClient {
  id: string;
  name: string;
  thirtyDayPct: number;
  delta: number;
}

export type InsightAccent = "green" | "gold" | "crimson" | "neutral";

export interface CoachInsight {
  icon: string;
  text: string;
  accent: InsightAccent;
}

export interface CoachAnalyticsPayload {
  /** Raw counts from RPC (display-name mapped) */
  thriving: number;
  atRisk: number;
  critical: number;
  goneDark: number;
  total: number;

  /** Roster-wide compliance averages */
  compliance: ComplianceAverages;

  /** Critical + gone dark */
  flaggedCount: number;

  /** Top 5 clients with largest positive 7d-vs-30d delta */
  improved: TrendClient[];

  /** Top 5 clients with largest negative 7d-vs-30d delta */
  declining: TrendClient[];

  /** Deterministic insights derived from roster signals */
  insights: CoachInsight[];

  /** Per-client alerts hydrated with lifecycle state */
  alerts: HydratedAlert[];

  /** Count of clients who have not journaled today */
  noJournalTodayCount: number;
}
