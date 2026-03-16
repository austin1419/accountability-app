// ─────────────────────────────────────────────
// alertStateQueries — SERVER ONLY
//
// Read/write alert lifecycle state from the
// coach_alert_state table. Used by the orchestrator
// to hydrate generated alerts with persisted state,
// and by server actions to persist state changes.
//
// The table is not in generated Supabase types yet,
// so queries use raw SQL via .rpc() or cast through
// unknown to bypass type checking.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import type { AlertStatus, InterventionType } from "./types";

// ── Types ────────────────────────────────────────────────────────

export interface AlertStateRow {
  id: string;
  coach_id: string;
  client_id: string;
  alert_type: string;
  status: AlertStatus;
  reviewed_at: string | null;
  resolved_at: string | null;
  coach_note: string | null;
  intervention_type: InterventionType | null;
  intervention_note: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

// ── Read ─────────────────────────────────────────────────────────

/**
 * Fetch all alert state rows for a coach.
 * Returns a Map keyed by "client_id::alert_type" for O(1) lookup.
 */
export async function getAlertStates(
  coachId: string,
): Promise<Map<string, AlertStateRow>> {
  const supabase = createAdminClient();

  // Table not in generated types — cast to bypass
  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  }).from("coach_alert_state").select("*").eq("coach_id", coachId);

  if (error) {
    console.error("[getAlertStates] query failed:", error);
    return new Map();
  }

  const map = new Map<string, AlertStateRow>();
  for (const row of (data ?? []) as AlertStateRow[]) {
    map.set(`${row.client_id}::${row.alert_type}`, row);
  }
  return map;
}

// ── Write ────────────────────────────────────────────────────────

/**
 * Upsert alert state. Uses the unique index on
 * (coach_id, client_id, alert_type) for conflict resolution.
 */
export async function upsertAlertState(
  coachId: string,
  clientId: string,
  alertType: string,
  status: AlertStatus,
  coachNote?: string,
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    coach_id: coachId,
    client_id: clientId,
    alert_type: alertType,
    status,
    updated_at: now,
  };

  if (status === "reviewed" || status === "action_taken") {
    row.reviewed_at = now;
  }
  if (status === "resolved") {
    row.reviewed_at = row.reviewed_at ?? now;
    row.resolved_at = now;
  }
  if (coachNote !== undefined) {
    row.coach_note = coachNote;
  }

  // Table not in generated types — cast to bypass
  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      upsert: (data: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
    };
  }).from("coach_alert_state").upsert(row, { onConflict: "coach_id,client_id,alert_type" });

  if (error) {
    console.error("[upsertAlertState] failed:", error);
    return { error: String((error as { message?: string }).message ?? error) };
  }

  return {};
}

// ── Intervention Write ───────────────────────────────────────────

export interface InterventionData {
  interventionType: InterventionType;
  interventionNote: string;
  followUpDate: string | null;
}

/**
 * Upsert alert state with intervention metadata.
 * Sets status to "action_taken" and persists
 * the intervention details in one operation.
 */
export async function upsertAlertIntervention(
  coachId: string,
  clientId: string,
  alertType: string,
  intervention: InterventionData,
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    coach_id: coachId,
    client_id: clientId,
    alert_type: alertType,
    status: "action_taken",
    reviewed_at: now,
    updated_at: now,
    intervention_type: intervention.interventionType,
    intervention_note: intervention.interventionNote,
    follow_up_date: intervention.followUpDate,
  };

  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      upsert: (data: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
    };
  }).from("coach_alert_state").upsert(row, { onConflict: "coach_id,client_id,alert_type" });

  if (error) {
    console.error("[upsertAlertIntervention] failed:", error);
    return { error: String((error as { message?: string }).message ?? error) };
  }

  return {};
}
