// ─────────────────────────────────────────────
// getCoachDashboard.ts  — SERVER ONLY
//
// Calls the get_coach_dashboard Supabase RPC and returns
// the typed JSON payload for the Coach Dashboard UI.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

// ── Roster Snapshot (one row per active client) ──────────────────

export interface RosterClient {
  client_id: string;
  client_name: string;
  client_email: string;
  is_active: boolean;
  today_pct: number;
  seven_day_pct: number;
  thirty_day_pct: number;
  latest_journal_date: string | null;
  has_journal_today: boolean;
  last_task_log_date: string | null;
  days_since_active: number | null;
  latest_stress: number | null;
  latest_energy: number | null;
  status_label: "thriving" | "at_risk" | "critical" | "gone_dark";
}

// ── Alert (one row per client per alert type) ────────────────────

export interface CoachAlert {
  client_id: string;
  client_name: string;
  alert_type: string;
  alert_priority: number;
  alert_message: string;
  detail_value: string | null;
}

// ── Status counts (derived from roster snapshot) ─────────────────

export interface StatusCounts {
  total: number;
  critical: number;
  warning: number;
  good: number;
  gone_dark: number;
}

// ── Priority client (top 5 by alert severity) ────────────────────

export interface PriorityClient {
  client_id: string;
  client_name: string;
  top_alert_type: string;
  top_alert_priority: number;
  alert_count: number;
}

// ── Full dashboard payload ───────────────────────────────────────

export interface CoachDashboardPayload {
  roster_snapshot: RosterClient[];
  alerts: CoachAlert[];
  counts: StatusCounts;
  priority_clients: PriorityClient[];
}

// ── RPC call ─────────────────────────────────────────────────────

export async function getCoachDashboard(
  coachId: string,
): Promise<CoachDashboardPayload> {
  const supabase = createAdminClient();

  // The RPC is not in the generated Supabase types yet, so we use
  // a generic .rpc() call and cast through unknown.
  const { data, error } = await (supabase.rpc as CallableFunction)(
    "get_coach_dashboard",
    { p_coach_id: coachId },
  );

  if (error) {
    console.error("[getCoachDashboard] RPC failed:", error);
    throw new Error(`getCoachDashboard failed: ${(error as { message: string }).message}`);
  }

  return data as unknown as CoachDashboardPayload;
}
