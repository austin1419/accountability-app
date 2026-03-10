// ─────────────────────────────────────────────
// queries.ts — Supabase data fetching functions
//
// All database queries live here, separate from the UI components.
// This keeps page files clean and makes it easy to swap data sources later.
// ─────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { Task } from "@/lib/mockData";

// ── Return type for the dashboard query ───────
// Describes exactly what data the dashboard page will receive.
export type DashboardData = {
  clientName: string;
  goal: {
    goal_name: string;
    start_weight: number | null;
    goal_weight: number | null;
    current_weight: number | null;
  } | null;
  today: {
    completed: number;  // how many tasks completed today
    total: number;      // how many tasks exist
    percent: number;    // completed / total * 100
  };
  week: {
    completed: number;  // tasks completed in last 7 days
    total: number;      // total log entries in last 7 days
    percent: number;    // completed / total * 100
  };
};

// ── fetchDashboard ─────────────────────────────
// Fetches everything the dashboard page needs in 4 queries.
// Called server-side so the page renders with data already filled in.
export async function fetchDashboard(userId: string): Promise<DashboardData> {

  // ── 1. Client name ─────────────────────────
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  if (userError) console.error("[dashboard] users query failed:", userError);

  // ── 2. Goal (most recent one for this client) ──
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("goal_name, start_weight, goal_weight, current_weight, id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goalError) console.error("[dashboard] goals query failed:", goalError);

  // ── 3. Today's compliance ──────────────────
  const today = new Date().toISOString().split("T")[0]; // e.g. "2026-03-10"

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id")
    .eq("goal_id", goal?.id ?? "");

  if (tasksError) console.error("[dashboard] tasks query failed:", tasksError);

  const totalTasks = tasks?.length ?? 0;

  const { data: todayLogs, error: todayError } = await supabase
    .from("task_logs")
    .select("completed")
    .eq("user_id", userId)
    .eq("date", today);

  if (todayError) console.error("[dashboard] today logs query failed:", todayError);

  const todayCompleted = (todayLogs ?? []).filter((l) => l.completed).length;
  const todayPercent   = totalTasks > 0
    ? Math.round((todayCompleted / totalTasks) * 100)
    : 0;

  // ── 4. Weekly compliance ───────────────────
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = sixDaysAgo.toISOString().split("T")[0];

  const { data: weekLogs, error: weekError } = await supabase
    .from("task_logs")
    .select("completed")
    .eq("user_id", userId)
    .gte("date", weekStart)
    .lte("date", today);

  if (weekError) console.error("[dashboard] week logs query failed:", weekError);

  const weekTotal     = weekLogs?.length ?? 0;
  const weekCompleted = (weekLogs ?? []).filter((l) => l.completed).length;
  const weekPercent   = weekTotal > 0
    ? Math.round((weekCompleted / weekTotal) * 100)
    : 0;

  // ── Return everything the dashboard needs ──
  return {
    clientName: user?.name ?? "there",
    goal: goal
      ? {
          goal_name:      goal.goal_name,
          start_weight:   goal.start_weight,
          goal_weight:    goal.goal_weight,
          current_weight: goal.current_weight,
        }
      : null,
    today: { completed: todayCompleted, total: totalTasks, percent: todayPercent },
    week:  { completed: weekCompleted,  total: weekTotal,  percent: weekPercent  },
  };
}

// ── fetchTodaysTasks ───────────────────────────
// Fetches tasks for the client's active goal, with today's completion status.
// Used by TasksContext to load real data from Supabase on mount.
export async function fetchTodaysTasks(userId: string): Promise<Task[]> {
  const today = new Date().toISOString().split("T")[0];

  // Find the client's most recent goal
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goalError) console.error("[fetchTodaysTasks] goals query failed:", goalError);
  if (!goal) return [];

  // Get all tasks for this goal
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, task_name, category")
    .eq("goal_id", goal.id);

  if (tasksError) console.error("[fetchTodaysTasks] tasks query failed:", tasksError);
  if (!tasks || tasks.length === 0) return [];

  // Get today's task_log entries to know which are checked off
  const { data: logs, error: logsError } = await supabase
    .from("task_logs")
    .select("task_id, completed")
    .eq("user_id", userId)
    .eq("date", today);

  if (logsError) console.error("[fetchTodaysTasks] logs query failed:", logsError);

  // Build a map of taskId → completed so we can look it up quickly
  const logMap = new Map((logs ?? []).map((l) => [l.task_id, l.completed]));

  return tasks.map((t) => ({
    id:       t.id,
    label:    t.task_name,
    category: t.category ?? "General",
    done:     logMap.get(t.id) ?? false,
  }));
}

// ── upsertTaskLog ──────────────────────────────
// Creates or updates a task_log row for today.
// Called whenever a user checks or unchecks a task.
export async function upsertTaskLog(
  taskId:    string,
  userId:    string,
  completed: boolean,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("task_logs")
    .upsert(
      { task_id: taskId, user_id: userId, date: today, completed },
      { onConflict: "task_id,user_id,date" },
    );

  if (error) console.error("[upsertTaskLog] failed:", error);
}

// ── fetchGoalData ──────────────────────────────
// Fetches weight-related goal data for the Progress page.
export async function fetchGoalData(userId: string) {
  const { data, error } = await supabase
    .from("goals")
    .select("goal_name, start_weight, goal_weight, current_weight")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error("[fetchGoalData] failed:", error);
  return data;
}

// ── updateCurrentWeight ────────────────────────
// Updates the current_weight field on the client's active goal.
// Called when the user logs a new weight on the Progress page.
export async function updateCurrentWeight(userId: string, weight: number): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ current_weight: weight })
    .eq("user_id", userId);

  if (error) console.error("[updateCurrentWeight] failed:", error);
}

// ── LeaderboardEntry — shape of one row in the accountability leaderboard ──
export type LeaderboardEntry = {
  id:           string;
  name:         string;
  weekPercent:  number;  // 7-day compliance %
  todayPercent: number;  // today's compliance %
  goalProgress: number;  // % toward goal weight (0–100)
  goalName:     string | null;
};

// ── fetchLeaderboard ───────────────────────────
// Loads all clients with their weekly compliance, today's compliance,
// and goal progress. Returns them sorted best → worst by weekly compliance.
// Used by the Accountability page so clients can see how they stack up.
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const today = new Date().toISOString().split("T")[0];
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = sixDaysAgo.toISOString().split("T")[0];

  // ── 1. All clients ─────────────────────────
  const { data: clients, error: clientsError } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "client");

  if (clientsError) console.error("[fetchLeaderboard] users query failed:", clientsError);
  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  // ── 2. Most recent goal per client ─────────
  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("id, user_id, goal_name, start_weight, goal_weight, current_weight")
    .in("user_id", clientIds)
    .order("created_at", { ascending: false });

  if (goalsError) console.error("[fetchLeaderboard] goals query failed:", goalsError);

  // Keep only the first (most recent) goal per user
  const goalByUser = new Map<string, NonNullable<typeof goals>[number]>();
  for (const g of goals ?? []) {
    if (!goalByUser.has(g.user_id)) goalByUser.set(g.user_id, g);
  }

  // ── 3. Task count per goal ─────────────────
  const goalIds = [...goalByUser.values()].map((g) => g.id);
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, goal_id")
    .in("goal_id", goalIds);

  if (tasksError) console.error("[fetchLeaderboard] tasks query failed:", tasksError);

  const taskCountByGoal = new Map<string, number>();
  for (const t of tasks ?? []) {
    taskCountByGoal.set(t.goal_id, (taskCountByGoal.get(t.goal_id) ?? 0) + 1);
  }

  // ── 4. Task logs for last 7 days (all clients in one query) ──
  const { data: logs, error: logsError } = await supabase
    .from("task_logs")
    .select("user_id, date, completed")
    .in("user_id", clientIds)
    .gte("date", weekStart)
    .lte("date", today);

  if (logsError) console.error("[fetchLeaderboard] logs query failed:", logsError);

  // ── 5. Compute per-client stats and sort ───
  const entries: LeaderboardEntry[] = clients.map((client) => {
    const goal      = goalByUser.get(client.id) ?? null;
    const taskCount = goal ? (taskCountByGoal.get(goal.id) ?? 0) : 0;

    const clientLogs   = (logs ?? []).filter((l) => l.user_id === client.id);
    const todayLogs    = clientLogs.filter((l) => l.date === today);
    const weekTotal    = clientLogs.length;
    const weekDone     = clientLogs.filter((l) => l.completed).length;
    const todayDone    = todayLogs.filter((l) => l.completed).length;

    const weekPercent  = weekTotal > 0
      ? Math.round((weekDone / weekTotal) * 100) : 0;
    const todayPercent = taskCount > 0
      ? Math.round((todayDone / taskCount) * 100) : 0;

    // Goal weight progress: how far between start_weight and goal_weight
    const goalProgress =
      goal?.start_weight != null &&
      goal?.current_weight != null &&
      goal?.goal_weight != null &&
      goal.start_weight - goal.goal_weight > 0
        ? Math.min(
            Math.max(
              Math.round(
                ((goal.start_weight - goal.current_weight) /
                  (goal.start_weight - goal.goal_weight)) * 100
              ),
              0
            ),
            100
          )
        : 0;

    return {
      id:           client.id,
      name:         client.name,
      weekPercent,
      todayPercent,
      goalProgress,
      goalName:     goal?.goal_name ?? null,
    };
  });

  // Best weekly compliance first
  return entries.sort((a, b) => b.weekPercent - a.weekPercent);
}
