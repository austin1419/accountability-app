// ─────────────────────────────────────────────
// queries.ts — client-side Supabase query functions
//
// These functions are called from client components ("use client").
// They use the browser Supabase client, so the user's JWT is included
// automatically and RLS policies apply correctly.
//
// Server-side query functions (coach portal, dashboard fetch) live in
// server-queries.ts and use the admin client.
// ─────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { Task, WeightEntry } from "@/lib/mockData";


// ── fetchTasksForDate ─────────────────────────
// Fetches tasks for the client's active goal, with completion status for a given date.
// Used by TasksContext to load real data from Supabase.
// The caller passes the date from DateContext — no independent "today" computation.
export async function fetchTasksForDate(userId: string, date: string): Promise<Task[]> {
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (goalError) console.error("[fetchTasksForDate] goals query failed:", goalError);
  if (!goal) return [];

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, task_name, category")
    .eq("goal_id", goal.id)
    .eq("is_active", true);

  if (tasksError) console.error("[fetchTasksForDate] tasks query failed:", tasksError);
  if (!tasks || tasks.length === 0) return [];

  const { data: logs, error: logsError } = await supabase
    .from("task_logs")
    .select("task_id, completed")
    .eq("user_id", userId)
    .eq("date", date);

  if (logsError) console.error("[fetchTasksForDate] logs query failed:", logsError);

  const logMap = new Map((logs ?? []).map((l) => [l.task_id, l.completed]));

  return tasks.map((t) => ({
    id:       t.id,
    label:    t.task_name,
    category: t.category ?? "General",
    done:     logMap.get(t.id) ?? false,
  }));
}


// ── upsertTaskLog ──────────────────────────────
// Creates or updates a task_log row for the given date.
// Called whenever a user checks or unchecks a task.
// The caller passes the date from DateContext.
export async function upsertTaskLog(
  taskId:    string,
  userId:    string,
  completed: boolean,
  date:      string,
): Promise<void> {
  const { error } = await supabase
    .from("task_logs")
    .upsert(
      { task_id: taskId, user_id: userId, date, completed },
      { onConflict: "task_id,user_id,date" },
    );

  if (error) console.error("[upsertTaskLog] failed:", error);
}


// ── fetchGoalData ──────────────────────────────
// Fetches all goal metric data for the Progress page (all three categories).
export async function fetchGoalData(userId: string) {
  const { data, error } = await supabase
    .from("goals")
    .select("id, goal_name, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) console.error("[fetchGoalData] failed:", error);
  return data;
}


// ── fetchProgressLog ───────────────────────────
// Loads body composition or performance log entries for a user's active goal.
export async function fetchProgressLog(userId: string, goalId: string): Promise<{
  logged_at: string;
  body_fat: number | null;
  smm: number | null;
  performance_value: number | null;
}[]> {
  const { data, error } = await supabase
    .from("progress_logs")
    .select("logged_at, body_fat, smm, performance_value")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("logged_at", { ascending: true });

  if (error) console.error("[fetchProgressLog] failed:", error);
  return (data ?? []).map((r) => ({
    logged_at:         r.logged_at,
    body_fat:          r.body_fat          != null ? Number(r.body_fat)          : null,
    smm:               r.smm               != null ? Number(r.smm)               : null,
    performance_value: r.performance_value != null ? Number(r.performance_value) : null,
  }));
}


// ── insertProgressLog ──────────────────────────
// Upserts a progress_log row for the given date (body comp or performance).
// The caller passes the date from DateContext.
export async function insertProgressLog(
  userId: string,
  goalId: string,
  patch:  { body_fat?: number | null; smm?: number | null; performance_value?: number | null },
  date:   string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("progress_logs")
    .upsert(
      { user_id: userId, goal_id: goalId, logged_at: date, ...patch },
      { onConflict: "user_id,goal_id,logged_at" }
    );
  if (error) {
    console.error("[insertProgressLog] failed:", error);
    return { error: "Failed to save progress." };
  }
  return {};
}


// ── updateCurrentMetrics ───────────────────────
// Patches current_* metric columns on the user's active goal row.
export async function updateCurrentMetrics(
  userId: string,
  patch:  { current_body_fat?: number | null; current_smm?: number | null; current_performance_value?: number | null }
): Promise<{ error?: string }> {
  const { error } = await supabase.from("goals").update(patch).eq("user_id", userId).eq("is_active", true);
  if (error) {
    console.error("[updateCurrentMetrics] failed:", error);
    return { error: "Failed to update metrics." };
  }
  return {};
}


// ── updateCurrentWeight ────────────────────────
// Updates the current_weight field on the client's active goal.
// Called when the user logs a new weight on the Progress page.
export async function updateCurrentWeight(userId: string, weight: number): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("goals")
    .update({ current_weight: weight })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("[updateCurrentWeight] failed:", error);
    return { error: "Failed to update current weight." };
  }
  return {};
}


// ── fetchWeightLog ─────────────────────────────
// Loads all weight entries for a user, oldest first, for the chart + log list.
export async function fetchWeightLog(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight, logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });

  if (error) console.error("[fetchWeightLog] failed:", error);

  return (data ?? []).map((row) => ({
    week:   new Date(row.logged_at + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day:   "numeric",
    }),
    weight:    Number(row.weight),
    logged_at: row.logged_at,
  }));
}


// ── insertWeightLog ────────────────────────────
// Saves a weight entry for the given date. Upserts so logging twice in a day
// replaces rather than duplicates (matches the unique index on user_id + logged_at).
// The caller passes the date from DateContext.
export async function insertWeightLog(userId: string, weight: number, date: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: userId, weight, logged_at: date },
      { onConflict: "user_id,logged_at" },
    );

  if (error) {
    console.error("[insertWeightLog] failed:", error);
    return { error: "Failed to save weight." };
  }
  return {};
}


// ── createClient ───────────────────────────────
// Creates a new client user + their first goal in one operation.
// Called from the Add Client modal on the coach clients page.
// NOTE: Will move to a server action in Phase 3 when the invite flow is added.
export async function createClient(data: {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string | null;
  goalName:       string;
  goalDate:       string;
  startingWeight: number | null;
}): Promise<{ error?: string }> {
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      name:         `${data.firstName} ${data.lastName}`,
      email:        data.email,
      phone_number: data.phone,
      role:         "client",
    })
    .select("id")
    .single();

  if (userError) {
    if (userError.code === "23505") {
      return { error: "A client with that email already exists." };
    }
    console.error("[createClient] users insert failed:", userError.message, userError.details, userError.hint);
    return { error: "Failed to create client. Please try again." };
  }

  const { error: goalError } = await supabase
    .from("goals")
    .insert({
      user_id:      newUser.id,
      goal_name:    data.goalName,
      goal_date:    data.goalDate,
      start_weight: data.startingWeight,
    });

  if (goalError) {
    await supabase.from("users").delete().eq("id", newUser.id);
    console.error("[createClient] goals insert failed:", goalError.message);
    return { error: "Failed to save goal. Please try again." };
  }

  return {};
}


// ── addHabit ───────────────────────────────────
// Adds a new habit/task to a client's goal from the coach detail page.
export async function addHabit(
  goalId:   string,
  taskName: string,
  category: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("tasks")
    .insert({ goal_id: goalId, task_name: taskName, category });

  if (error) {
    console.error("[addHabit] insert failed:", error.message);
    return { error: "Failed to save habit. Please try again." };
  }
  return {};
}


// ── deleteHabit ────────────────────────────────
// Soft-deletes a habit by setting is_active = false.
// The row and its task_logs are preserved for history;
// the habit simply stops appearing in the client app and
// active compliance counts.
export async function deleteHabit(taskId: string, reason?: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("tasks")
    .update({ is_active: false, removal_reason: reason ?? null })
    .eq("id", taskId);
  if (error) {
    console.error("[deleteHabit] soft-delete failed:", error.message);
    return { error: "Failed to remove habit. Please try again." };
  }
  return {};
}


// ── fetchStreak ────────────────────────────────
// Calculates the user's current daily streak from task_logs.
// A day counts if ALL active tasks were completed that day.
// Today counts if complete; if today is incomplete the streak
// reflects the most recent consecutive run ending yesterday.
export async function fetchStreak(userId: string): Promise<number> {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(d);

  const today = fmt(new Date());

  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!goal) return 0;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("goal_id", goal.id)
    .eq("is_active", true);

  const totalTasks = tasks?.length ?? 0;
  if (totalTasks === 0) return 0;

  const taskIds = (tasks ?? []).map((t) => t.id);

  // Fetch up to 90 days of logs — enough for any realistic streak
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - 90);
  const startStr = fmt(lookback);

  const { data: logs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today)
    .in("task_id", taskIds);

  // Count completed tasks per calendar day
  const completedByDate: Record<string, number> = {};
  for (const log of logs ?? []) {
    if (log.completed) {
      completedByDate[log.date] = (completedByDate[log.date] ?? 0) + 1;
    }
  }

  // Walk backwards from today:
  // • today not yet complete → skip (streak not broken, just in progress)
  // • past day fully complete → count it
  // • past day not fully complete → stop
  let streak = 0;
  const cursor = new Date(today + "T12:00:00");

  for (let i = 0; i <= 90; i++) {
    const dateStr   = fmt(cursor);
    const completed = completedByDate[dateStr] ?? 0;

    if (completed >= totalTasks) {
      streak++;
    } else if (dateStr < today) {
      break; // past day incomplete — streak is over
    }
    // dateStr === today && not complete → fall through, keep checking yesterday

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}


// ── fetchMonthCompliance ───────────────────────
// Returns a map of date → compliance % for all days in a given month that have data.
// Used by CalendarModal to color-code each day.
export async function fetchMonthCompliance(
  userId: string,
  year:   number,
  month:  number, // 1-indexed (1 = January)
): Promise<Record<string, number>> {
  const monthStr   = String(month).padStart(2, "0");
  const monthStart = `${year}-${monthStr}-01`;
  const lastDay    = new Date(year, month, 0).getDate();
  const todayStr   = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const rawEnd     = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
  const monthEnd   = rawEnd < todayStr ? rawEnd : todayStr;

  if (monthStart > todayStr) return {};

  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!goal) return {};

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("goal_id", goal.id)
    .eq("is_active", true);

  const totalTasks = tasks?.length ?? 0;
  if (totalTasks === 0) return {};

  const taskIds = (tasks ?? []).map((t) => t.id);

  const { data: logs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", userId)
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .in("task_id", taskIds.length > 0 ? taskIds : [""]);

  if (!logs || logs.length === 0) return {};

  const byDate: Record<string, { completed: number }> = {};
  for (const log of logs) {
    if (!byDate[log.date]) byDate[log.date] = { completed: 0 };
    if (log.completed) byDate[log.date].completed += 1;
  }

  const result: Record<string, number> = {};
  for (const [date, { completed }] of Object.entries(byDate)) {
    result[date] = Math.round((completed / totalTasks) * 100);
  }
  return result;
}
