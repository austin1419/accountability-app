// ─────────────────────────────────────────────
// server-queries.ts  — SERVER ONLY
//
// Data-fetching functions used exclusively by Server Components.
// Uses the admin (service role) Supabase client, which bypasses RLS.
// This is safe because these functions only ever run on the server,
// after the calling layout has already verified the user's session.
//
// Client-side query functions remain in queries.ts.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";


// ── Types ─────────────────────────────────────────────────────────

// Shared goal metrics type used across dashboard, coach detail, and leaderboard
export type GoalMetrics = {
  goal_category:              string;
  // Weight
  start_weight:               number | null;
  goal_weight:                number | null;
  current_weight:             number | null;
  // Body composition
  starting_body_fat:          number | null;
  current_body_fat:           number | null;
  goal_body_fat:              number | null;
  starting_smm:               number | null;
  current_smm:                number | null;
  goal_smm:                   number | null;
  // Performance
  performance_metric_name:    string | null;
  performance_unit:           string | null;
  performance_direction:      string | null;
  starting_performance_value: number | null;
  current_performance_value:  number | null;
  goal_performance_value:     number | null;
};

// Columns to SELECT from goals whenever we need full metrics
// Must be a single string literal (not concatenated) so Supabase's TypeScript
// type inference can parse the column names at compile time.
const GOAL_METRICS_SELECT = "id, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value" as const;

// Compute goal progress (0–100) for any goal category
function computeGoalProgress(g: GoalMetrics): number {
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);

  if (g.goal_category === "body_composition") {
    const parts: number[] = [];
    if (g.starting_body_fat != null && g.current_body_fat != null && g.goal_body_fat != null
        && g.starting_body_fat - g.goal_body_fat > 0) {
      parts.push(clamp(((g.starting_body_fat - g.current_body_fat) / (g.starting_body_fat - g.goal_body_fat)) * 100));
    }
    if (g.starting_smm != null && g.current_smm != null && g.goal_smm != null
        && g.goal_smm - g.starting_smm > 0) {
      parts.push(clamp(((g.current_smm - g.starting_smm) / (g.goal_smm - g.starting_smm)) * 100));
    }
    return parts.length === 0 ? 0 : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  if (g.goal_category === "performance") {
    const { performance_direction: dir, starting_performance_value: s,
            current_performance_value: c, goal_performance_value: goal } = g;
    if (s == null || c == null || goal == null || dir == null) return 0;
    if (dir === "increase") return goal - s <= 0 ? 0 : clamp(((c - s) / (goal - s)) * 100);
    return s - goal <= 0 ? 0 : clamp(((s - c) / (s - goal)) * 100);
  }

  // Default: weight
  const { start_weight: s, current_weight: c, goal_weight: goal } = g;
  if (s == null || c == null || goal == null || s - goal <= 0) return 0;
  return clamp(((s - c) / (s - goal)) * 100);
}

export type DashboardData = {
  clientName: string;
  goal: (GoalMetrics & {
    goal_name:    string;
    goalProgress: number;
  }) | null;
  today: {
    completed: number;
    total:     number;
    percent:   number;
  };
  week: {
    completed: number;
    total:     number;
    percent:   number;
  };
};

export type LeaderboardEntry = {
  id:           string;
  name:         string;
  weekPercent:  number;
  todayPercent: number;
  goalProgress: number;
  goalName:     string | null;
};

export type CoachClientRow = {
  id:            string;
  name:          string;
  createdAt:     string;
  goalName:      string | null;
  goalProgress:  number;
  currentWeight: number | null;
  todayPercent:  number;
  weekPercent:   number;
  monthPercent:  number;
  isFlagged:     boolean;
};

export type ArchivedClientRow = {
  id:             string;
  name:           string;
  email:          string;
  goalName:       string | null;
  archiveReason:  string | null;
};

export type ClientNote = {
  id:         string;
  note:       string;
  created_at: string;
};

export type ClientDetail = {
  id:    string;
  name:  string;
  email: string;
  phone: string | null;
  goal: (GoalMetrics & {
    id:           string;
    goal_name:    string;
    goal_date:    string | null;
    goalProgress: number;
  }) | null;
  tasks:         { id: string; task_name: string; category: string | null }[];
  archivedTasks: { id: string; task_name: string; category: string | null; removal_reason: string | null }[];
  clientNotes:   ClientNote[];
  todayPercent: number;
  weekPercent:  number;
  monthPercent: number;
};


// ── fetchDashboard ─────────────────────────────────────────────────
export async function fetchDashboard(userId: string, date: string): Promise<DashboardData> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  const { data: goal } = await supabase
    .from("goals")
    .select(GOAL_METRICS_SELECT)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const today = date;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("goal_id", goal?.id ?? "")
    .eq("is_active", true);

  const totalTasks = tasks?.length ?? 0;

  const { data: todayLogs } = await supabase
    .from("task_logs")
    .select("completed")
    .eq("user_id", userId)
    .eq("date", today);

  const todayCompleted = (todayLogs ?? []).filter((l) => l.completed).length;
  const todayPercent   = totalTasks > 0
    ? Math.round((todayCompleted / totalTasks) * 100) : 0;

  const anchor = new Date(date + "T00:00:00");
  const sixBefore = new Date(anchor);
  sixBefore.setDate(anchor.getDate() - 6);
  const weekStart = sixBefore.toISOString().split("T")[0];

  const { data: weekLogs } = await supabase
    .from("task_logs")
    .select("completed")
    .eq("user_id", userId)
    .gte("date", weekStart)
    .lte("date", today);

  const weekTotal     = weekLogs?.length ?? 0;
  const weekCompleted = (weekLogs ?? []).filter((l) => l.completed).length;
  const weekPercent   = weekTotal > 0
    ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  return {
    clientName: user?.name ?? "there",
    goal: goal
      ? {
          goal_name:    goal.goal_name,
          goalProgress: computeGoalProgress(goal as GoalMetrics),
          goal_category: goal.goal_category,
          start_weight:               goal.start_weight,
          goal_weight:                goal.goal_weight,
          current_weight:             goal.current_weight,
          starting_body_fat:          goal.starting_body_fat,
          current_body_fat:           goal.current_body_fat,
          goal_body_fat:              goal.goal_body_fat,
          starting_smm:               goal.starting_smm,
          current_smm:                goal.current_smm,
          goal_smm:                   goal.goal_smm,
          performance_metric_name:    goal.performance_metric_name,
          performance_unit:           goal.performance_unit,
          performance_direction:      goal.performance_direction,
          starting_performance_value: goal.starting_performance_value,
          current_performance_value:  goal.current_performance_value,
          goal_performance_value:     goal.goal_performance_value,
        }
      : null,
    today: { completed: todayCompleted, total: totalTasks, percent: todayPercent },
    week:  { completed: weekCompleted,  total: weekTotal,  percent: weekPercent  },
  };
}


// ── fetchLeaderboard ──────────────────────────────────────────────
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = sixDaysAgo.toISOString().split("T")[0];

  const { data: clients } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "client")
    .eq("is_active", true);

  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: goals } = await supabase
    .from("goals")
    .select("user_id, id, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value")
    .in("user_id", clientIds)
    .eq("is_active", true);

  const goalByUser = new Map<string, NonNullable<typeof goals>[number]>();
  for (const g of goals ?? []) {
    goalByUser.set(g.user_id, g);
  }

  const goalIds = [...goalByUser.values()].map((g) => g.id);
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, goal_id")
    .in("goal_id", goalIds);

  const taskCountByGoal = new Map<string, number>();
  for (const t of tasks ?? []) {
    taskCountByGoal.set(t.goal_id, (taskCountByGoal.get(t.goal_id) ?? 0) + 1);
  }

  const { data: logs } = await supabase
    .from("task_logs")
    .select("user_id, date, completed")
    .in("user_id", clientIds)
    .gte("date", weekStart)
    .lte("date", today);

  const entries: LeaderboardEntry[] = clients.map((client) => {
    const goal      = goalByUser.get(client.id) ?? null;
    const taskCount = goal ? (taskCountByGoal.get(goal.id) ?? 0) : 0;

    const clientLogs   = (logs ?? []).filter((l) => l.user_id === client.id);
    const todayLogs    = clientLogs.filter((l) => l.date === today);
    const weekTotal    = clientLogs.length;
    const weekDone     = clientLogs.filter((l) => l.completed).length;
    const todayDone    = todayLogs.filter((l) => l.completed).length;

    const weekPercent  = weekTotal > 0 ? Math.round((weekDone  / weekTotal)  * 100) : 0;
    const todayPercent = taskCount > 0 ? Math.round((todayDone / taskCount)  * 100) : 0;
    const goalProgress = goal ? computeGoalProgress(goal as unknown as GoalMetrics) : 0;

    return { id: client.id, name: client.name, weekPercent, todayPercent, goalProgress, goalName: goal?.goal_name ?? null };
  });

  return entries.sort((a, b) => b.weekPercent - a.weekPercent);
}


// ── fetchAllClientsForCoach ────────────────────────────────────────
export async function fetchAllClientsForCoach(): Promise<CoachClientRow[]> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = sixDaysAgo.toISOString().split("T")[0];

  const twentyNineDaysAgo = new Date();
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  const monthStart = twentyNineDaysAgo.toISOString().split("T")[0];

  const { data: clients, error: clientsError } = await supabase
    .from("users")
    .select("id, name, created_at")
    .eq("role", "client")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (clientsError) console.error("[fetchAllClientsForCoach] users query failed:", clientsError);
  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: goals } = await supabase
    .from("goals")
    .select("user_id, id, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value")
    .in("user_id", clientIds)
    .eq("is_active", true);

  const goalByUser = new Map<string, NonNullable<typeof goals>[number]>();
  for (const g of goals ?? []) {
    goalByUser.set(g.user_id, g);
  }

  const goalIds = [...goalByUser.values()].map((g) => g.id);
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, goal_id")
    .in("goal_id", goalIds.length > 0 ? goalIds : [""])
    .eq("is_active", true);

  const taskCountByGoal = new Map<string, number>();
  for (const t of tasks ?? []) {
    taskCountByGoal.set(t.goal_id, (taskCountByGoal.get(t.goal_id) ?? 0) + 1);
  }

  const { data: logs } = await supabase
    .from("task_logs")
    .select("user_id, date, completed")
    .in("user_id", clientIds)
    .gte("date", monthStart)
    .lte("date", today);

  return clients.map((client) => {
    const goal      = goalByUser.get(client.id) ?? null;
    const taskCount = goal ? (taskCountByGoal.get(goal.id) ?? 0) : 0;
    const allLogs   = (logs ?? []).filter((l) => l.user_id === client.id);

    const todayLogs    = allLogs.filter((l) => l.date === today);
    const todayDone    = todayLogs.filter((l) => l.completed).length;
    const todayPercent = taskCount > 0 ? Math.round((todayDone / taskCount) * 100) : 0;

    const weekLogs    = allLogs.filter((l) => l.date >= weekStart);
    const weekDone    = weekLogs.filter((l) => l.completed).length;
    const weekPercent = weekLogs.length > 0 ? Math.round((weekDone / weekLogs.length) * 100) : 0;

    const monthDone    = allLogs.filter((l) => l.completed).length;
    const monthPercent = allLogs.length > 0 ? Math.round((monthDone / allLogs.length) * 100) : 0;

    const goalProgress = goal ? computeGoalProgress(goal as unknown as GoalMetrics) : 0;

    return {
      id:            client.id,
      name:          client.name,
      createdAt:     client.created_at,
      goalName:      goal?.goal_name ?? null,
      goalProgress,
      currentWeight: goal?.current_weight ?? null,
      todayPercent,
      weekPercent,
      monthPercent,
      isFlagged:     todayPercent < 70 || weekPercent < 70 || monthPercent < 70,
    };
  });
}


// ── fetchArchivedClientsForCoach ───────────────────────────────────
export async function fetchArchivedClientsForCoach(): Promise<ArchivedClientRow[]> {
  const supabase = createAdminClient();

  const { data: clients } = await supabase
    .from("users")
    .select("id, name, email, archive_reason")
    .eq("role", "client")
    .eq("is_active", false)
    .order("name", { ascending: true });

  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: goals } = await supabase
    .from("goals")
    .select("user_id, goal_name")
    .in("user_id", clientIds)
    .eq("is_active", true);

  const goalByUser = new Map<string, string>();
  for (const g of goals ?? []) {
    goalByUser.set(g.user_id, g.goal_name);
  }

  return clients.map((c) => ({
    id:            c.id,
    name:          c.name,
    email:         c.email,
    goalName:      goalByUser.get(c.id) ?? null,
    archiveReason: c.archive_reason ?? null,
  }));
}


// ── fetchClientDetail ──────────────────────────────────────────────
export async function fetchClientDetail(clientId: string): Promise<ClientDetail | null> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = sixDaysAgo.toISOString().split("T")[0];

  const twentyNineDaysAgo = new Date();
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  const monthStart = twentyNineDaysAgo.toISOString().split("T")[0];

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, phone_number")
    .eq("id", clientId)
    .maybeSingle();

  if (!user) return null;

  const { data: goal } = await supabase
    .from("goals")
    .select(GOAL_METRICS_SELECT)
    .eq("user_id", clientId)
    .eq("is_active", true)
    .maybeSingle();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, task_name, category")
    .eq("goal_id", goal?.id ?? "")
    .eq("is_active", true);

  const { data: archivedTasks } = await supabase
    .from("tasks")
    .select("id, task_name, category, removal_reason")
    .eq("goal_id", goal?.id ?? "")
    .eq("is_active", false);

  const { data: notes } = await supabase
    .from("client_notes")
    .select("id, note, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const { data: logs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", clientId)
    .gte("date", monthStart)
    .lte("date", today);

  const totalTasks = tasks?.length ?? 0;
  const allLogs    = logs ?? [];

  const todayLogs    = allLogs.filter((l) => l.date === today);
  const todayDone    = todayLogs.filter((l) => l.completed).length;
  const todayPercent = totalTasks > 0 ? Math.round((todayDone / totalTasks) * 100) : 0;

  const weekLogs    = allLogs.filter((l) => l.date >= weekStart);
  const weekDone    = weekLogs.filter((l) => l.completed).length;
  const weekPercent = weekLogs.length > 0 ? Math.round((weekDone / weekLogs.length) * 100) : 0;

  const monthDone    = allLogs.filter((l) => l.completed).length;
  const monthPercent = allLogs.length > 0 ? Math.round((monthDone / allLogs.length) * 100) : 0;

  const goalProgress = goal ? computeGoalProgress(goal as unknown as GoalMetrics) : 0;

  return {
    id:    user.id,
    name:  user.name,
    email: user.email,
    phone: user.phone_number ?? null,
    goal: goal
      ? {
          id:           goal.id,
          goal_name:    goal.goal_name,
          goal_date:    goal.goal_date ?? null,
          goalProgress,
          goal_category:              goal.goal_category,
          start_weight:               goal.start_weight ?? null,
          goal_weight:                goal.goal_weight ?? null,
          current_weight:             goal.current_weight ?? null,
          starting_body_fat:          goal.starting_body_fat ?? null,
          current_body_fat:           goal.current_body_fat ?? null,
          goal_body_fat:              goal.goal_body_fat ?? null,
          starting_smm:               goal.starting_smm ?? null,
          current_smm:                goal.current_smm ?? null,
          goal_smm:                   goal.goal_smm ?? null,
          performance_metric_name:    goal.performance_metric_name ?? null,
          performance_unit:           goal.performance_unit ?? null,
          performance_direction:      goal.performance_direction ?? null,
          starting_performance_value: goal.starting_performance_value ?? null,
          current_performance_value:  goal.current_performance_value ?? null,
          goal_performance_value:     goal.goal_performance_value ?? null,
        }
      : null,
    tasks: (tasks ?? []).map((t) => ({
      id:        t.id,
      task_name: t.task_name,
      category:  t.category ?? null,
    })),
    archivedTasks: (archivedTasks ?? []).map((t) => ({
      id:             t.id,
      task_name:      t.task_name,
      category:       t.category ?? null,
      removal_reason: t.removal_reason ?? null,
    })),
    clientNotes: (notes ?? []).map((n) => ({
      id:         n.id,
      note:       n.note,
      created_at: n.created_at,
    })),
    todayPercent,
    weekPercent,
    monthPercent,
  };
}
