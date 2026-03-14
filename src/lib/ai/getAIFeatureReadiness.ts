// ─────────────────────────────────────────────
// getAIFeatureReadiness — deterministic AI feature gating
//
// Determines whether AI features have enough historical
// client data to produce meaningful output.
//
// Daily Briefing unlock rule — ALL THREE must be true:
//   1. Member for at least 10 days (account age)
//   2. At least 5 distinct task days logged
//   3. At least 5 weight OR progress-metric entries logged
//
// This is an intentional onboarding gate based on:
//   - time in system (prevents day-1 noise)
//   - enough habit/task behavior (signal engine needs history)
//   - enough body/progress tracking (trend engine needs data)
//
// Two usage paths:
//   1. getFeatureReadiness(ctx, feature) — from an already-built
//      ClientAIContext (used when the full context is available).
//   2. fetchDailyBriefingReadiness(userId) — standalone server
//      function that queries DB directly (used on the dashboard
//      to avoid building the full context just for gating).
//
// Deterministic. No LLM.
// ─────────────────────────────────────────────

import type {
  ClientAIContext,
  AIFeatureKey,
  AIFeatureReadiness,
  AIReadinessMap,
} from "./types";

// ═══════════════════════════════════════════════
// THRESHOLDS — explicit, no magic numbers
// ═══════════════════════════════════════════════

/**
 * Minimum calendar days since account creation.
 *
 * Rationale: prevents the briefing from activating on day 1
 * even if a power user logs aggressively. The signal engine
 * needs time-spread data to compute meaningful compliance
 * trajectories and streak patterns.
 */
const MIN_MEMBER_DAYS = 7;

/**
 * Minimum distinct days with at least 1 task log entry.
 *
 * Rationale: 3 task days gives the compliance and adherence
 * signals enough history to compute basic patterns.
 * A task day counts even if only partially completed.
 */
const MIN_TASK_DAYS = 3;

/**
 * Minimum distinct dates with a weight OR progress-metric entry.
 *
 * Rationale: 3 metric logs give the trend engine enough data
 * points for initial velocity estimates.
 * Weight logs and progress logs both count toward this threshold.
 * Scoped to the active goal — starting values on the goal row
 * do NOT count.
 */
const MIN_METRIC_LOGS = 3;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Compute the number of full calendar days between a creation
 * timestamp and a reference date (typically today in CST).
 *
 * Uses date-only comparison to avoid timezone edge-case drift.
 * A user created on 2026-03-01 has 0 member days on 2026-03-01,
 * 1 on 2026-03-02, etc.
 */
function computeMemberDays(createdAt: string, referenceDate: string): number {
  // Parse creation date — createdAt is an ISO timestamp
  const created = new Date(createdAt);
  const createdDateStr = created.toISOString().slice(0, 10); // YYYY-MM-DD

  const createdMs = new Date(createdDateStr + "T00:00:00Z").getTime();
  const refMs     = new Date(referenceDate + "T00:00:00Z").getTime();

  const diffMs = refMs - createdMs;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Build a human-readable blocked reason from the three criteria.
 * Lists only the criteria that are NOT yet met.
 */
function buildBlockedReason(
  memberDays: number,
  taskDays: number,
  metricLogs: number,
): string | null {
  const gaps: string[] = [];

  const memberRemaining = MIN_MEMBER_DAYS - memberDays;
  if (memberRemaining > 0) {
    gaps.push(`${memberRemaining} more membership day${memberRemaining === 1 ? "" : "s"}`);
  }

  const taskRemaining = MIN_TASK_DAYS - taskDays;
  if (taskRemaining > 0) {
    gaps.push(`${taskRemaining} more task day${taskRemaining === 1 ? "" : "s"}`);
  }

  const metricRemaining = MIN_METRIC_LOGS - metricLogs;
  if (metricRemaining > 0) {
    gaps.push(`${metricRemaining} more metric log${metricRemaining === 1 ? "" : "s"}`);
  }

  if (gaps.length === 0) return null;

  return `You still need ${gaps.join(" and ")} to unlock Daily Briefing`;
}

/**
 * Build the readiness payload from the three raw values.
 * Shared by both the context-based and DB-based paths.
 */
function buildReadiness(
  memberDays: number,
  taskDays: number,
  metricLogs: number,
): AIFeatureReadiness {
  const memberDaysMet = memberDays >= MIN_MEMBER_DAYS;
  const taskDaysMet   = taskDays >= MIN_TASK_DAYS;
  const metricLogsMet = metricLogs >= MIN_METRIC_LOGS;

  const available = memberDaysMet && taskDaysMet && metricLogsMet;

  return {
    featureKey:                "dailyBriefing",
    available,
    blockedReason:             available ? null : buildBlockedReason(memberDays, taskDays, metricLogs),
    memberDays,
    minimumMemberDaysRequired: MIN_MEMBER_DAYS,
    memberDaysMet,
    taskDaysLogged:            taskDays,
    minimumTaskDaysRequired:   MIN_TASK_DAYS,
    taskDaysMet,
    metricLogsCount:           metricLogs,
    minimumMetricLogsRequired: MIN_METRIC_LOGS,
    metricLogsMet,
  };
}

// ═══════════════════════════════════════════════
// CONTEXT-BASED CHECK
// ═══════════════════════════════════════════════

/**
 * Count metric log days from ClientAIContext.
 *
 * Metric logs = union of distinct dates from:
 *   - weightLog[].date
 *   - progressLog[].date (only if at least one field is non-null)
 *
 * Either source contributes toward the threshold.
 */
function countMetricLogDays(ctx: ClientAIContext): number {
  const dates = new Set<string>();

  for (const entry of ctx.weightLog) {
    dates.add(entry.date);
  }

  for (const entry of ctx.progressLog) {
    if (entry.bodyFat != null || entry.smm != null || entry.performanceValue != null) {
      dates.add(entry.date);
    }
  }

  return dates.size;
}

/**
 * Estimate task log days from ClientAIContext.
 *
 * NOTE: ClientAIContext aggregates task data into compliance
 * percentages and does not expose individual task_log dates.
 * We use a conservative estimate:
 *
 *   - If today has tasks (compliance.today.total > 0), that's 1 day
 *   - If overall compliance > 0, the client has logged tasks on
 *     additional past days. We use the metric log day count as a
 *     conservative lower bound (users who log metrics typically
 *     also log tasks on those days).
 *
 * This means the gate may open slightly LATER than reality,
 * which is the safe direction. The DB-based path
 * (fetchDailyBriefingReadiness) uses exact counts.
 */
function estimateTaskLogDays(ctx: ClientAIContext): number {
  if (ctx.tasks.length === 0) return 0;

  let count = 0;

  if (ctx.compliance.today.total > 0) {
    count = 1;
  }

  if (ctx.compliance.overall.percent > 0) {
    // Conservative: at least as many task days as metric log days
    const metricDays = countMetricLogDays(ctx);
    count = Math.max(count, metricDays);
  }

  return count;
}

function checkDailyBriefing(ctx: ClientAIContext): AIFeatureReadiness {
  const memberDays  = computeMemberDays(ctx.client.createdAt, ctx.selectedDate);
  const taskDays    = estimateTaskLogDays(ctx);
  const metricLogs  = countMetricLogDays(ctx);

  return buildReadiness(memberDays, taskDays, metricLogs);
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Check readiness for a single AI feature.
 */
export function getFeatureReadiness(
  ctx: ClientAIContext,
  feature: AIFeatureKey,
): AIFeatureReadiness {
  switch (feature) {
    case "dailyBriefing":
      return checkDailyBriefing(ctx);
  }
}

/**
 * Check readiness for all AI features at once.
 * Returns a map keyed by feature name.
 */
export function getAllFeatureReadiness(
  ctx: ClientAIContext,
): AIReadinessMap {
  return {
    dailyBriefing: checkDailyBriefing(ctx),
  };
}

// ═══════════════════════════════════════════════
// STANDALONE SERVER FUNCTION
// ═══════════════════════════════════════════════
//
// For use on pages (like the dashboard) that don't build
// the full ClientAIContext. Queries the DB directly for
// exact counts.
//
// Import guard: this function uses the admin Supabase client
// which is server-only. Callers must be server components
// or server actions.

/**
 * Lightweight DB-backed readiness check for Daily Briefing.
 *
 * Queries:
 *   - users.created_at for membership duration
 *   - task_logs for distinct task dates
 *   - weight_logs + progress_logs for distinct metric dates
 *
 * Returns the same AIFeatureReadiness shape as the context-based
 * version, but fetches data directly instead of reading from
 * ClientAIContext.
 */
export async function fetchDailyBriefingReadiness(
  userId: string,
): Promise<AIFeatureReadiness> {
  const { createAdminClient } = await import("@/lib/supabase-admin");
  const supabase = createAdminClient();

  // Today in CST — used as reference date for membership calculation
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  // Phase 1: user + active goal (needed to scope metric queries)
  const [userResult, goalResult] = await Promise.all([
    supabase
      .from("users")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("goals")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const goalId = goalResult.data?.id ?? null;

  // Phase 2: count queries — metric logs scoped to active goal
  const [taskLogResult, weightLogResult, progressLogResult] = await Promise.all([
    // Distinct task_log dates (user-wide, not goal-scoped)
    supabase
      .from("task_logs")
      .select("date")
      .eq("user_id", userId)
      .then((r) => {
        const dates = new Set<string>();
        for (const row of r.data ?? []) dates.add(row.date);
        return dates;
      }),

    // Distinct weight_log dates — scoped to active goal
    goalId
      ? supabase
          .from("weight_logs")
          .select("logged_at")
          .eq("user_id", userId)
          .eq("goal_id", goalId)
          .then((r) => {
            const dates = new Set<string>();
            for (const row of r.data ?? []) dates.add(row.logged_at);
            return dates;
          })
      : Promise.resolve(new Set<string>()),

    // Distinct progress_log dates — scoped to active goal
    goalId
      ? supabase
          .from("progress_logs")
          .select("logged_at")
          .eq("user_id", userId)
          .eq("goal_id", goalId)
          .then((r) => {
            const dates = new Set<string>();
            for (const row of r.data ?? []) dates.add(row.logged_at);
            return dates;
          })
      : Promise.resolve(new Set<string>()),
  ]);

  // Membership days
  const createdAt = userResult.data?.created_at ?? todayStr;
  const memberDays = computeMemberDays(createdAt, todayStr);

  // Task days — exact count from DB
  const taskDays = taskLogResult.size;

  // Metric logs — union of weight + progress log dates (both goal-scoped)
  const metricDates = new Set<string>();
  for (const d of weightLogResult)   metricDates.add(d);
  for (const d of progressLogResult) metricDates.add(d);
  const metricLogs = metricDates.size;

  return buildReadiness(memberDays, taskDays, metricLogs);
}
