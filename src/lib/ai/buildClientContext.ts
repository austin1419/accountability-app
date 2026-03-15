// ─────────────────────────────────────────────
// buildClientContext — SERVER ONLY
//
// Assembles all client data into a single ClientAIContext
// for downstream AI consumers. Pure read-only data assembly.
//
// Reuses existing deterministic functions from server-queries.ts
// and computeGoalProgress.ts. Makes direct admin queries only
// for data not covered by existing utilities.
//
// CRITICAL: This function is READ-ONLY. It never writes to the
// database, never mutates state, and never calls the LLM.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { computeGoalProgress, type GoalMetrics } from "@/lib/computeGoalProgress";
import {
  fetchProfileCompliance,
  fetchProgressTrends,
  fetchProgressSummary,
  fetchStatusScore,
} from "@/lib/server-queries";
import type {
  ClientAIContext,
  TaskSnapshot,
  WeightLogEntry,
  ProgressLogEntry,
  ClientNote,
  GoalContext,
  ComplianceContext,
  CoachingProfileContext,
  JournalEntry,
} from "./types";

// ── Helpers ──────────────────────────────────

/** CST-aware YYYY-MM-DD string */
function cstDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(d);
}

/** Inclusive calendar-day count between two YYYY-MM-DD strings.
 *  Uses T12:00:00 (noon) to avoid DST-transition off-by-one errors. */
function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T12:00:00").getTime();
  const e = new Date(end   + "T12:00:00").getTime();
  return Math.round((e - s) / 86_400_000) + 1;
}

/** Clamp a window start so it never precedes createdAt */
function effectiveStart(windowStart: string, createdAt: string): string {
  return createdAt > windowStart ? createdAt : windowStart;
}

// ── Server-side streak calculation ───────────
// Mirrors the logic in queries.ts fetchStreak but uses admin client.

async function fetchStreakServer(
  userId: string,
  goalId: string,
  taskIds: string[],
  totalTasks: number,
  selectedDate: string,
): Promise<number> {
  if (totalTasks === 0 || taskIds.length === 0) return 0;

  const supabase = createAdminClient();
  const today = selectedDate;

  // Compute lookback from selectedDate (not current time)
  const anchorDate = new Date(selectedDate + "T12:00:00");
  anchorDate.setDate(anchorDate.getDate() - 90);
  const startStr = cstDate(anchorDate);

  const { data: logs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today)
    .in("task_id", taskIds);

  const completedByDate: Record<string, number> = {};
  for (const log of logs ?? []) {
    if (log.completed) {
      completedByDate[log.date] = (completedByDate[log.date] ?? 0) + 1;
    }
  }

  let streak = 0;
  const cursor = new Date(today + "T12:00:00");

  for (let i = 0; i <= 90; i++) {
    const dateStr   = cstDate(cursor);
    const completed = completedByDate[dateStr] ?? 0;

    if (completed >= totalTasks) {
      streak++;
    } else if (dateStr < today) {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// ── Main function ────────────────────────────

const GOAL_METRICS_SELECT =
  "id, created_at, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value" as const;

export async function buildClientContext(
  userId: string,
  selectedDate: string,
): Promise<ClientAIContext> {
  const supabase = createAdminClient();

  // ── Phase 1: Parallel independent queries ──────────────────────
  const [
    userRow,
    goalRow,
    compliance,
    progressTrends,
    progressSummary,
    statusScore,
    coachingAnswers,
    notesResult,
    journalRow,
  ] = await Promise.all([
    // User profile
    supabase
      .from("users")
      .select("id, name, email, created_at")
      .eq("id", userId)
      .maybeSingle()
      .then((r) => r.data),

    // Active goal
    supabase
      .from("goals")
      .select(GOAL_METRICS_SELECT)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle()
      .then((r) => r.data),

    // Compliance (reuse existing server function)
    fetchProfileCompliance(userId, selectedDate),

    // Progress trends (reuse existing, anchored to selectedDate)
    fetchProgressTrends(userId, selectedDate),

    // Progress summary (reuse existing, anchored to selectedDate)
    fetchProgressSummary(userId, selectedDate),

    // Status score (reuse existing)
    fetchStatusScore(userId, selectedDate),

    // Coaching profile answers (server-side version)
    supabase
      .from("coaching_profile_answers")
      .select("section_key, question_key, answer_value_json")
      .eq("user_id", userId)
      .then((r) => {
        const result: CoachingProfileContext = {};
        for (const row of r.data ?? []) {
          if (!result[row.section_key]) result[row.section_key] = {};
          result[row.section_key][row.question_key] = row.answer_value_json;
        }
        return result;
      }),

    // Client notes
    supabase
      .from("client_notes")
      .select("id, note, created_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .then((r) => r.data ?? []),

    // Journal entry for selected date
    supabase
      .from("daily_journal")
      .select("sleep_hours, felt_rested, protein_hit, hydration_hit, alcohol, trained_today, zone2_cardio, recovery_work, supplements_taken, stress_level, energy_level")
      .eq("user_id", userId)
      .eq("date", selectedDate)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  // ── Phase 2: Goal-dependent queries ────────────────────────────
  // These need the goalId from phase 1.

  const goalId = goalRow?.id ?? null;

  const [tasksResult, weightLogResult, progressLogResult] = await Promise.all([
    // Active tasks
    goalId
      ? supabase
          .from("tasks")
          .select("id, task_name, category")
          .eq("goal_id", goalId)
          .eq("is_active", true)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),

    // Weight logs (up to 90 entries, oldest first)
    goalId
      ? supabase
          .from("weight_logs")
          .select("logged_at, weight")
          .eq("user_id", userId)
          .eq("goal_id", goalId)
          .order("logged_at", { ascending: true })
          .limit(90)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),

    // Progress logs (up to 90 entries, oldest first)
    goalId
      ? supabase
          .from("progress_logs")
          .select("logged_at, body_fat, smm, performance_value")
          .eq("user_id", userId)
          .eq("goal_id", goalId)
          .order("logged_at", { ascending: true })
          .limit(90)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  // ── Phase 3: Task-dependent queries ────────────────────────────
  // Need task IDs for today's completion + streak.

  const taskIds = tasksResult.map((t) => t.id);

  const [todayLogs, streak] = await Promise.all([
    // Today's completion status
    taskIds.length > 0
      ? supabase
          .from("task_logs")
          .select("task_id, completed")
          .eq("user_id", userId)
          .eq("date", selectedDate)
          .in("task_id", taskIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),

    // Streak
    goalId && taskIds.length > 0
      ? fetchStreakServer(userId, goalId, taskIds, tasksResult.length, selectedDate)
      : Promise.resolve(0),
  ]);

  // ── Assemble tasks with completion status ──────────────────────

  const todayLogMap = new Map(
    todayLogs.map((l) => [l.task_id, l.completed as boolean]),
  );

  const tasks: TaskSnapshot[] = tasksResult.map((t) => ({
    id:       t.id,
    name:     t.task_name,
    category: t.category ?? null,
    done:     todayLogMap.get(t.id) ?? false,
  }));

  // ── Assemble today compliance ──────────────────────────────────

  const todayCompleted = tasks.filter((t) => t.done).length;
  const todayTotal     = tasks.length;
  const todayPercent   = todayTotal > 0
    ? Math.round((todayCompleted / todayTotal) * 100)
    : 0;

  const complianceContext: ComplianceContext = {
    today:   { completed: todayCompleted, total: todayTotal, percent: todayPercent },
    week:    { percent: compliance.weekPercent },
    month:   { percent: compliance.monthPercent },
    overall: { percent: compliance.overallPercent },
  };

  // ── Assemble goal context ──────────────────────────────────────

  let goalContext: GoalContext | null = null;
  if (goalRow) {
    const metrics = goalRow as unknown as GoalMetrics;
    goalContext = {
      id:                         goalRow.id,
      goalName:                   goalRow.goal_name,
      goalDate:                   goalRow.goal_date ?? null,
      goalProgress:               computeGoalProgress(metrics),
      goal_category:              goalRow.goal_category,
      start_weight:               goalRow.start_weight ?? null,
      goal_weight:                goalRow.goal_weight ?? null,
      current_weight:             goalRow.current_weight ?? null,
      starting_body_fat:          goalRow.starting_body_fat ?? null,
      current_body_fat:           goalRow.current_body_fat ?? null,
      goal_body_fat:              goalRow.goal_body_fat ?? null,
      starting_smm:               goalRow.starting_smm ?? null,
      current_smm:                goalRow.current_smm ?? null,
      goal_smm:                   goalRow.goal_smm ?? null,
      performance_metric_name:    goalRow.performance_metric_name ?? null,
      performance_unit:           goalRow.performance_unit ?? null,
      performance_direction:      goalRow.performance_direction ?? null,
      starting_performance_value: goalRow.starting_performance_value ?? null,
      current_performance_value:  goalRow.current_performance_value ?? null,
      goal_performance_value:     goalRow.goal_performance_value ?? null,
    };
  }

  // ── Assemble weight log ────────────────────────────────────────

  const weightLog: WeightLogEntry[] = weightLogResult
    .filter((r) => r.weight != null)
    .map((r) => ({
      date:   r.logged_at,
      weight: Number(r.weight),
    }));

  // ── Assemble progress log ──────────────────────────────────────

  const progressLog: ProgressLogEntry[] = progressLogResult.map((r) => ({
    date:             r.logged_at,
    bodyFat:          r.body_fat          != null ? Number(r.body_fat)          : null,
    smm:              r.smm               != null ? Number(r.smm)               : null,
    performanceValue: r.performance_value != null ? Number(r.performance_value) : null,
  }));

  // ── Assemble notes ─────────────────────────────────────────────

  const notes: ClientNote[] = notesResult.map((n) => ({
    id:        n.id,
    note:      n.note,
    createdAt: n.created_at,
  }));

  // ── Assemble journal entry ─────────────────────────────────────

  const journalEntry: JournalEntry | null = journalRow
    ? {
        sleepHours:       journalRow.sleep_hours  != null ? Number(journalRow.sleep_hours)  : null,
        feltRested:       journalRow.felt_rested       ?? null,
        proteinHit:       journalRow.protein_hit       ?? null,
        hydrationHit:     journalRow.hydration_hit     ?? null,
        alcohol:          journalRow.alcohol            ?? null,
        trainedToday:     journalRow.trained_today     ?? null,
        zone2Cardio:      journalRow.zone2_cardio      ?? null,
        recoveryWork:     journalRow.recovery_work     ?? null,
        supplementsTaken: journalRow.supplements_taken ?? null,
        stressLevel:      journalRow.stress_level != null ? Number(journalRow.stress_level) : null,
        energyLevel:      journalRow.energy_level != null ? Number(journalRow.energy_level) : null,
      }
    : null;

  // ── Return assembled context ───────────────────────────────────

  return {
    selectedDate,
    builtAt: new Date().toISOString(),
    client: {
      userId:    userRow?.id ?? userId,
      name:      userRow?.name ?? "Unknown",
      email:     userRow?.email ?? "",
      createdAt: userRow?.created_at ?? "",
    },
    goal:            goalContext,
    compliance:      complianceContext,
    tasks,
    streak,
    progressTrends,
    progressSummary,
    statusScore,
    weightLog,
    progressLog,
    coachingProfile: coachingAnswers,
    notes,
    journalEntry,
  };
}
