// ─────────────────────────────────────────────
// getCoachDashboardData — SERVER ONLY
//
// Dedicated data utility for /coach dashboard.
// Fetches bounded parallel queries and delegates
// to computeCoachDashboardMetrics for derived values.
//
// Uses explicit field selection on every query.
// Uses the same auth pattern as existing coach pages.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { computeCoachDashboardMetrics } from "./computeCoachDashboardMetrics";
import type { RawClient, RawGoal, RawTask, RawTaskLog, RawAlertState } from "./computeCoachDashboardMetrics";
import type { CoachDashboardData } from "./types";

export type { CoachDashboardData } from "./types";
export type { DashboardClient, DashboardAlert, RosterCounts, DashboardKPIs, PriorityItem, RecentIntervention, FollowUpDue, PillarBreakdown, DailyCompliance, CoachInsight } from "./types";

// ── Date helpers ─────────────────────────────────────────────────

function cstToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function cstDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

// ── Untyped table helper (coach_alert_state not in generated types) ──

type UntypedQuery = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        in: (col: string, vals: string[]) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
};

// ── Main fetcher ─────────────────────────────────────────────────

export async function getCoachDashboardData(
  coachId: string,
): Promise<CoachDashboardData> {
  const supabase = createAdminClient();

  const today = cstToday();
  const thirtyDaysAgo = cstDaysAgo(29);

  // Step 1: Get active clients (all clients with role='client', is_active=true, not soft-deleted)
  const { data: rawClients, error: clientsErr } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "client")
    .eq("is_active", true)
    .eq("is_deleted" as "is_active", false);

  if (clientsErr) {
    console.error("[getCoachDashboardData] clients query failed:", clientsErr);
  }

  const clients: RawClient[] = (rawClients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  if (clients.length === 0) {
    return computeCoachDashboardMetrics({
      clients: [],
      goals: [],
      tasks: [],
      taskLogs: [],
      alertStates: [],
    });
  }

  const clientIds = clients.map((c) => c.id);

  // Step 2: Parallel bounded queries
  const [goalsResult, taskLogsResult, alertStatesResult] = await Promise.all([
    // Active goals for these clients
    supabase
      .from("goals")
      .select("id, user_id, goal_name, goal_category, created_at")
      .in("user_id", clientIds)
      .eq("is_active", true),

    // Task logs for last 30 days (override default 1000-row limit)
    supabase
      .from("task_logs")
      .select("user_id, task_id, date, completed")
      .in("user_id", clientIds)
      .gte("date", thirtyDaysAgo)
      .lte("date", today)
      .limit(10000),

    // Alert states for this coach + these clients
    (supabase as unknown as UntypedQuery)
      .from("coach_alert_state")
      .select("client_id, alert_type, status, resolved_at, updated_at, intervention_type, intervention_note, coach_note, follow_up_date")
      .eq("coach_id", coachId)
      .in("client_id", clientIds),
  ]);

  const goals: RawGoal[] = (goalsResult.data ?? []).map((g) => ({
    id: g.id,
    user_id: g.user_id,
    goal_name: g.goal_name,
    goal_category: g.goal_category ?? null,
    created_at: g.created_at,
  }));

  // Step 3: Get active tasks for these goals (needed for compliance denominator)
  const goalIds = goals.map((g) => g.id);
  let tasks: RawTask[] = [];

  if (goalIds.length > 0) {
    const { data: rawTasks } = await supabase
      .from("tasks")
      .select("id, goal_id, category")
      .in("goal_id", goalIds)
      .eq("is_active", true);

    tasks = (rawTasks ?? []).map((t) => ({ id: t.id, goal_id: t.goal_id, category: t.category ?? null }));
  }

  const taskLogs: RawTaskLog[] = (taskLogsResult.data ?? []).map((l) => ({
    user_id: l.user_id,
    task_id: l.task_id,
    date: l.date,
    completed: l.completed,
  }));

  const alertStates: RawAlertState[] = ((alertStatesResult.data ?? []) as Record<string, unknown>[]).map((a) => ({
    client_id: String(a.client_id),
    alert_type: String(a.alert_type),
    status: String(a.status),
    resolved_at: a.resolved_at ? String(a.resolved_at) : null,
    updated_at: String(a.updated_at),
    intervention_type: a.intervention_type ? String(a.intervention_type) : null,
    intervention_note: a.intervention_note ? String(a.intervention_note) : null,
    coach_note: a.coach_note ? String(a.coach_note) : null,
    follow_up_date: a.follow_up_date ? String(a.follow_up_date) : null,
  }));

  // Step 4: Compute and return
  return computeCoachDashboardMetrics({
    clients,
    goals,
    tasks,
    taskLogs,
    alertStates,
  });
}
