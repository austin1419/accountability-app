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
const GOAL_METRICS_SELECT = "id, created_at, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value" as const;

// Clamp a window start so it never precedes the user's created_at date.
// Returns the later of windowStart and createdAt (both YYYY-MM-DD).
function effectiveStart(windowStart: string, createdAt: string): string {
  return createdAt > windowStart ? createdAt : windowStart;
}

// Format a Date (or the current moment) as YYYY-MM-DD in CST
function cstDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(d);
}

// Extract YYYY-MM-DD from a timestamp string, using CST to match task_log dates
function toDateStr(timestamp: string): string {
  return cstDate(new Date(timestamp));
}

// Count calendar days between two YYYY-MM-DD strings (inclusive)
function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00").getTime();
  const e = new Date(end   + "T00:00:00").getTime();
  return Math.floor((e - s) / 86_400_000) + 1;
}

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
    goal_date:    string | null;
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
    .select("name, created_at")
    .eq("id", userId)
    .maybeSingle();

  const { data: goal } = await supabase
    .from("goals")
    .select(GOAL_METRICS_SELECT)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const createdDate = goal?.created_at
    ? toDateStr(goal.created_at)
    : user?.created_at ? toDateStr(user.created_at) : "2000-01-01";

  const today = date;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("goal_id", goal?.id ?? "")
    .eq("is_active", true);

  const totalTasks = tasks?.length ?? 0;
  const taskIds    = (tasks ?? []).map((t) => t.id);
  const taskIdFilter = taskIds.length > 0 ? taskIds : [""];

  const { data: todayLogs } = await supabase
    .from("task_logs")
    .select("completed")
    .eq("user_id", userId)
    .eq("date", today)
    .in("task_id", taskIdFilter);

  const todayCompleted = (todayLogs ?? []).filter((l) => l.completed).length;
  const todayPercent   = totalTasks > 0
    ? Math.round((todayCompleted / totalTasks) * 100) : 0;

  // Weekly compliance anchored to most recent Sunday (not rolling 7 days)
  const anchor = new Date(date + "T00:00:00");
  const sundayOffset = anchor.getDay(); // 0 = Sunday, 1 = Mon, ... 6 = Sat
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - sundayOffset);
  const weekStart = cstDate(sunday);

  const weekEffective  = effectiveStart(weekStart, createdDate);

  const { data: weekLogs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", userId)
    .gte("date", weekEffective)
    .lte("date", today)
    .in("task_id", taskIdFilter);

  const weekCompleted  = (weekLogs ?? []).filter((l) => l.completed).length;
  const weekExpected   = totalTasks * daysBetween(weekEffective, today);
  const weekPercent    = weekExpected > 0
    ? Math.round((weekCompleted / weekExpected) * 100) : 0;

  return {
    clientName: user?.name ?? "there",
    goal: goal
      ? {
          goal_name:    goal.goal_name,
          goal_date:    goal.goal_date ?? null,
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
    today: { completed: todayCompleted, total: totalTasks,   percent: todayPercent },
    week:  { completed: weekCompleted,  total: weekExpected, percent: weekPercent  },
  };
}


// ── fetchLeaderboard ──────────────────────────────────────────────
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createAdminClient();

  const today = cstDate();
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = cstDate(sixDaysAgo);

  const { data: clients } = await supabase
    .from("users")
    .select("id, name, created_at")
    .eq("role", "client")
    .eq("is_active", true);

  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: goals } = await supabase
    .from("goals")
    .select("user_id, id, created_at, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value")
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

  const allTaskIds = (tasks ?? []).map((t) => t.id);

  const { data: logs } = await supabase
    .from("task_logs")
    .select("user_id, date, completed")
    .in("user_id", clientIds)
    .gte("date", weekStart)
    .lte("date", today)
    .in("task_id", allTaskIds.length > 0 ? allTaskIds : [""]);

  const entries: LeaderboardEntry[] = clients.map((client) => {
    const goal      = goalByUser.get(client.id) ?? null;
    const taskCount = goal ? (taskCountByGoal.get(goal.id) ?? 0) : 0;

    const createdDate   = goal?.created_at ? toDateStr(goal.created_at) : toDateStr(client.created_at);
    const weekEff       = effectiveStart(weekStart, createdDate);
    const clientLogs    = (logs ?? []).filter((l) => l.user_id === client.id);
    const todayLogs     = clientLogs.filter((l) => l.date === today);
    const weekDone      = clientLogs.filter((l) => l.date >= weekEff && l.completed).length;
    const todayDone     = todayLogs.filter((l) => l.completed).length;
    const weekExpected  = taskCount * daysBetween(weekEff, today);

    const weekPercent  = weekExpected > 0 ? Math.round((weekDone / weekExpected) * 100) : 0;
    const todayPercent = taskCount > 0 ? Math.round((todayDone / taskCount)  * 100) : 0;
    const goalProgress = goal ? computeGoalProgress(goal as unknown as GoalMetrics) : 0;

    return { id: client.id, name: client.name, weekPercent, todayPercent, goalProgress, goalName: goal?.goal_name ?? null };
  });

  return entries.sort((a, b) => b.weekPercent - a.weekPercent);
}


// ── fetchAllClientsForCoach ────────────────────────────────────────
export async function fetchAllClientsForCoach(): Promise<CoachClientRow[]> {
  const supabase = createAdminClient();

  const today = cstDate();

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = cstDate(sixDaysAgo);

  const twentyNineDaysAgo = new Date();
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  const monthStart = cstDate(twentyNineDaysAgo);

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
    .select("user_id, id, created_at, goal_name, goal_date, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value")
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

  const allTaskIds = (tasks ?? []).map((t) => t.id);

  const { data: logs } = await supabase
    .from("task_logs")
    .select("user_id, date, completed")
    .in("user_id", clientIds)
    .gte("date", monthStart)
    .lte("date", today)
    .in("task_id", allTaskIds.length > 0 ? allTaskIds : [""]);

  return clients.map((client) => {
    const goal        = goalByUser.get(client.id) ?? null;
    const taskCount   = goal ? (taskCountByGoal.get(goal.id) ?? 0) : 0;
    const createdDate = goal?.created_at ? toDateStr(goal.created_at) : toDateStr(client.created_at);
    const allLogs     = (logs ?? []).filter((l) => l.user_id === client.id);

    const todayLogs    = allLogs.filter((l) => l.date === today);
    const todayDone    = todayLogs.filter((l) => l.completed).length;
    const todayPercent = taskCount > 0 ? Math.round((todayDone / taskCount) * 100) : 0;

    const weekEff       = effectiveStart(weekStart, createdDate);
    const monthEff      = effectiveStart(monthStart, createdDate);

    const weekDone      = allLogs.filter((l) => l.date >= weekEff && l.completed).length;
    const weekExpected  = taskCount * daysBetween(weekEff, today);
    const weekPercent   = weekExpected > 0 ? Math.round((weekDone / weekExpected) * 100) : 0;

    const monthDone     = allLogs.filter((l) => l.date >= monthEff && l.completed).length;
    const monthExpected = taskCount * daysBetween(monthEff, today);
    const monthPercent  = monthExpected > 0 ? Math.round((monthDone / monthExpected) * 100) : 0;

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
      isFlagged:     taskCount > 0 && (todayPercent < 70 || weekPercent < 70 || monthPercent < 70),
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


// ── fetchProfileCompliance ────────────────────────────────────────
// Returns weekly, monthly, and overall compliance for a single user.
// Used by the client-facing Profile page.
export type ProfileCompliance = {
  weekPercent:    number;
  monthPercent:   number;
  overallPercent: number;
};

export async function fetchProfileCompliance(userId: string, date?: string): Promise<ProfileCompliance> {
  const supabase = createAdminClient();

  // Use provided date or default to today (CST)
  const asOfDate = date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());

  // Sunday-anchored week
  const anchor = new Date(asOfDate + "T00:00:00");
  const sundayOffset = anchor.getDay();
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - sundayOffset);
  const weekStart = cstDate(sunday);

  // Calendar-month anchor (1st of the month containing asOfDate)
  const monthStart = asOfDate.slice(0, 7) + "-01";

  // Get user created_at as fallback for window clamping
  const { data: userRow } = await supabase
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();

  // Get active goal + tasks
  const { data: goal } = await supabase
    .from("goals")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const createdDate = goal?.created_at
    ? toDateStr(goal.created_at)
    : userRow?.created_at ? toDateStr(userRow.created_at) : "2000-01-01";

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("goal_id", goal?.id ?? "")
    .eq("is_active", true);

  const taskIds = (tasks ?? []).map((t) => t.id);
  if (taskIds.length === 0) return { weekPercent: 0, monthPercent: 0, overallPercent: 0 };

  // All logs for these tasks (all time, up to asOfDate)
  const { data: allLogs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", userId)
    .lte("date", asOfDate)
    .in("task_id", taskIds);

  const logs = allLogs ?? [];

  const taskCount = taskIds.length;

  const weekEffectiveStart  = effectiveStart(weekStart, createdDate);
  const monthEffectiveStart = effectiveStart(monthStart, createdDate);

  const weekDone       = logs.filter((l) => l.date >= weekEffectiveStart && l.completed).length;
  const weekExpected   = taskCount * daysBetween(weekEffectiveStart, asOfDate);
  const weekPercent    = weekExpected > 0 ? Math.round((weekDone / weekExpected) * 100) : 0;

  const monthDone      = logs.filter((l) => l.date >= monthEffectiveStart && l.completed).length;
  const monthExpected  = taskCount * daysBetween(monthEffectiveStart, asOfDate);
  const monthPercent   = monthExpected > 0 ? Math.round((monthDone / monthExpected) * 100) : 0;

  // Overall: from user creation date to asOfDate
  const overallDone     = logs.filter((l) => l.date >= createdDate && l.completed).length;
  const overallExpected = taskCount * daysBetween(createdDate, asOfDate);
  const overallPercent  = overallExpected > 0 ? Math.round((overallDone / overallExpected) * 100) : 0;

  return { weekPercent, monthPercent, overallPercent };
}


// ── fetchClientDetail ──────────────────────────────────────────────
export async function fetchClientDetail(clientId: string): Promise<ClientDetail | null> {
  const supabase = createAdminClient();

  const today = cstDate();

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const weekStart = cstDate(sixDaysAgo);

  const twentyNineDaysAgo = new Date();
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  const monthStart = cstDate(twentyNineDaysAgo);

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, phone_number, created_at")
    .eq("id", clientId)
    .maybeSingle();

  if (!user) return null;

  const { data: goal } = await supabase
    .from("goals")
    .select(GOAL_METRICS_SELECT)
    .eq("user_id", clientId)
    .eq("is_active", true)
    .maybeSingle();

  const createdDate = goal?.created_at
    ? toDateStr(goal.created_at)
    : toDateStr(user.created_at);

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

  const taskIds = (tasks ?? []).map((t) => t.id);

  const { data: logs } = await supabase
    .from("task_logs")
    .select("date, completed")
    .eq("user_id", clientId)
    .gte("date", monthStart)
    .lte("date", today)
    .in("task_id", taskIds.length > 0 ? taskIds : [""]);

  const totalTasks = tasks?.length ?? 0;
  const allLogs    = logs ?? [];

  const todayLogs    = allLogs.filter((l) => l.date === today);
  const todayDone    = todayLogs.filter((l) => l.completed).length;
  const todayPercent = totalTasks > 0 ? Math.round((todayDone / totalTasks) * 100) : 0;

  const weekEffStart   = effectiveStart(weekStart, createdDate);
  const monthEffStart  = effectiveStart(monthStart, createdDate);

  const weekDone       = allLogs.filter((l) => l.date >= weekEffStart && l.completed).length;
  const weekExpected   = totalTasks * daysBetween(weekEffStart, today);
  const weekPercent    = weekExpected > 0 ? Math.round((weekDone / weekExpected) * 100) : 0;

  const monthDone      = allLogs.filter((l) => l.date >= monthEffStart && l.completed).length;
  const monthExpected  = totalTasks * daysBetween(monthEffStart, today);
  const monthPercent   = monthExpected > 0 ? Math.round((monthDone / monthExpected) * 100) : 0;

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


// ── fetchProgressTrends ──────────────────────────────────────────
// Returns velocity, projected completion, and status for a user's active goal.
// Consumes weight_logs (weight goals) or progress_logs (body_comp / performance).
// No UI — pure data engine for downstream consumers.

export type ProgressTrends = {
  goalCategory:    string;
  metricLabel:     string;           // e.g. "Weight", "Body Fat", "Bench Press"
  unit:            string;           // e.g. "lbs", "%", "reps"
  startValue:      number | null;
  currentValue:    number | null;
  goalValue:       number | null;
  goalDate:        string | null;    // YYYY-MM-DD
  velocity7d:      number | null;    // change per day over last 7 days
  velocity30d:     number | null;    // change per day over last 30 days
  projectedDate:   string | null;    // estimated completion date (YYYY-MM-DD)
  status:          "ahead" | "on_track" | "behind" | "no_data";
};

export async function fetchProgressTrends(userId: string): Promise<ProgressTrends | null> {
  const supabase = createAdminClient();
  const today = cstDate();

  // ── Fetch active goal ──────────────────────────────────────────
  const { data: goal } = await supabase
    .from("goals")
    .select(GOAL_METRICS_SELECT)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!goal) return null;

  const cat = goal.goal_category ?? "weight";

  // ── Resolve metric identity ────────────────────────────────────
  let metricLabel: string;
  let unit: string;
  let startValue:   number | null;
  let currentValue: number | null;
  let goalValue:    number | null;
  let direction: "decrease" | "increase";

  if (cat === "body_composition") {
    // Primary metric: body fat if targets exist, otherwise SMM
    if (goal.starting_body_fat != null && goal.goal_body_fat != null) {
      metricLabel  = "Body Fat";
      unit         = "%";
      startValue   = goal.starting_body_fat;
      currentValue = goal.current_body_fat;
      goalValue    = goal.goal_body_fat;
      direction    = "decrease";
    } else {
      metricLabel  = "Skeletal Muscle Mass";
      unit         = "lbs";
      startValue   = goal.starting_smm;
      currentValue = goal.current_smm;
      goalValue    = goal.goal_smm;
      direction    = "increase";
    }
  } else if (cat === "performance") {
    metricLabel  = goal.performance_metric_name ?? "Performance";
    unit         = goal.performance_unit ?? "";
    startValue   = goal.starting_performance_value;
    currentValue = goal.current_performance_value;
    goalValue    = goal.goal_performance_value;
    direction    = (goal.performance_direction === "decrease") ? "decrease" : "increase";
  } else {
    // weight (default) — infer direction from start vs goal
    metricLabel  = "Weight";
    unit         = "lbs";
    startValue   = goal.start_weight;
    currentValue = goal.current_weight;
    goalValue    = goal.goal_weight;
    direction    = (startValue != null && goalValue != null && goalValue > startValue)
      ? "increase" : "decrease";
  }

  // ── Fetch log entries ──────────────────────────────────────────
  type LogPoint = { date: string; value: number };
  const points: LogPoint[] = [];

  if (cat === "weight") {
    const { data: wLogs } = await supabase
      .from("weight_logs")
      .select("logged_at, weight")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true });

    for (const row of wLogs ?? []) {
      if (row.weight != null) {
        points.push({ date: row.logged_at, value: Number(row.weight) });
      }
    }
  } else {
    // body_composition or performance — use progress_logs
    const { data: pLogs } = await supabase
      .from("progress_logs")
      .select("logged_at, body_fat, smm, performance_value")
      .eq("user_id", userId)
      .eq("goal_id", goal.id)
      .order("logged_at", { ascending: true });

    for (const row of pLogs ?? []) {
      let val: number | null = null;
      if (cat === "body_composition") {
        val = metricLabel === "Body Fat"
          ? (row.body_fat != null ? Number(row.body_fat) : null)
          : (row.smm != null ? Number(row.smm) : null);
      } else {
        val = row.performance_value != null ? Number(row.performance_value) : null;
      }
      if (val != null) {
        points.push({ date: row.logged_at, value: val });
      }
    }
  }

  // ── Compute velocities ────────────────────────────────────────
  // velocity = (last value - first value in window) / days between them
  function velocityForWindow(windowDays: number): number | null {
    const cutoff = new Date(today + "T00:00:00");
    cutoff.setDate(cutoff.getDate() - windowDays);
    const cutoffStr = cstDate(cutoff);

    const windowPoints = points.filter((p) => p.date >= cutoffStr);
    if (windowPoints.length < 2) return null;

    const first = windowPoints[0];
    const last  = windowPoints[windowPoints.length - 1];
    const days  = daysBetween(first.date, last.date);
    if (days <= 0) return null;

    return (last.value - first.value) / days;
  }

  const velocity7d  = velocityForWindow(7);
  const velocity30d = velocityForWindow(30);

  // Best available velocity for projection (prefer 30d, fallback to 7d)
  const bestVelocity = velocity30d ?? velocity7d;

  // ── Project completion date ───────────────────────────────────
  let projectedDate: string | null = null;

  if (bestVelocity != null && currentValue != null && goalValue != null) {
    const remaining = goalValue - currentValue; // positive if goal > current
    // For "decrease" goals, remaining is negative when on track (current > goal)
    // velocity should also be negative. remaining/velocity gives positive days.
    // For "increase" goals, remaining is positive, velocity should be positive.

    if (bestVelocity !== 0) {
      const daysToGoal = remaining / bestVelocity;
      if (daysToGoal > 0 && daysToGoal < 36500) { // sanity cap: ~100 years
        const projected = new Date(today + "T00:00:00");
        projected.setDate(projected.getDate() + Math.ceil(daysToGoal));
        projectedDate = cstDate(projected);
      }
      // daysToGoal <= 0 means goal already reached or moving wrong direction
    }
  }

  // ── Determine status ──────────────────────────────────────────
  let status: ProgressTrends["status"] = "no_data";

  if (bestVelocity == null || currentValue == null || goalValue == null) {
    status = "no_data";
  } else if (goal.goal_date && projectedDate) {
    const goalDateStr = goal.goal_date;
    // Compare projected vs goal date
    if (projectedDate <= goalDateStr) {
      status = "ahead";
    } else {
      // How far off? If within 10% of total timeline, "on_track"
      const createdStr = goal.created_at ? toDateStr(goal.created_at) : today;
      const totalDays  = daysBetween(createdStr, goalDateStr);
      const overDays   = daysBetween(goalDateStr, projectedDate) - 1; // excess days
      if (totalDays > 0 && overDays / totalDays <= 0.1) {
        status = "on_track";
      } else {
        status = "behind";
      }
    }
  } else if (bestVelocity !== 0) {
    // No goal date set — just check direction
    const movingRight = direction === "decrease"
      ? bestVelocity < 0
      : bestVelocity > 0;
    status = movingRight ? "on_track" : "behind";
  }

  return {
    goalCategory: cat,
    metricLabel,
    unit,
    startValue,
    currentValue,
    goalValue,
    goalDate:    goal.goal_date ?? null,
    velocity7d,
    velocity30d,
    projectedDate,
    status,
  };
}


// ── fetchProgressSummary ─────────────────────────────────────────
// Returns simple week/month deltas for weight, body fat, and SMM.
// Each delta compares the most recent log value against the closest
// entry to 7 or 30 days ago. Returns null per metric if insufficient data.

export type MetricDelta = {
  current:  number;
  prior:    number;
  change:   number;   // current - prior
};

export type ProgressSummary = {
  weight:  { week: MetricDelta | null; month: MetricDelta | null } | null;
  bodyFat: { week: MetricDelta | null; month: MetricDelta | null } | null;
  smm:     { week: MetricDelta | null; month: MetricDelta | null } | null;
};

export async function fetchProgressSummary(userId: string): Promise<ProgressSummary> {
  const supabase = createAdminClient();
  const today = cstDate();

  const sevenAgo  = new Date(today + "T00:00:00");
  sevenAgo.setDate(sevenAgo.getDate() - 7);
  const weekTarget = cstDate(sevenAgo);

  const thirtyAgo = new Date(today + "T00:00:00");
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const monthTarget = cstDate(thirtyAgo);

  // ── Helper: find closest entry to a target date ────────────────
  // Searches sorted points for the entry whose date is nearest to targetDate.
  type Point = { date: string; value: number };

  function closestTo(points: Point[], targetDate: string): Point | null {
    if (points.length === 0) return null;
    let best = points[0];
    let bestDist = Math.abs(daysBetween(
      best.date < targetDate ? best.date : targetDate,
      best.date < targetDate ? targetDate : best.date,
    ));
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const dist = Math.abs(daysBetween(
        p.date < targetDate ? p.date : targetDate,
        p.date < targetDate ? targetDate : p.date,
      ));
      if (dist < bestDist) { best = p; bestDist = dist; }
    }
    return best;
  }

  function buildDelta(points: Point[], targetDate: string): MetricDelta | null {
    if (points.length < 2) return null;
    const current = points[points.length - 1];
    const prior   = closestTo(points, targetDate);
    if (!prior || prior.date === current.date) return null;
    return { current: current.value, prior: prior.value, change: +(current.value - prior.value).toFixed(2) };
  }

  // ── Fetch weight logs ──────────────────────────────────────────
  let weight: ProgressSummary["weight"] = null;

  const { data: wLogs } = await supabase
    .from("weight_logs")
    .select("logged_at, weight")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });

  const weightPoints: Point[] = [];
  for (const row of wLogs ?? []) {
    if (row.weight != null) weightPoints.push({ date: row.logged_at, value: Number(row.weight) });
  }

  if (weightPoints.length >= 2) {
    weight = {
      week:  buildDelta(weightPoints, weekTarget),
      month: buildDelta(weightPoints, monthTarget),
    };
  }

  // ── Fetch progress logs (body fat + SMM) ───────────────────────
  let bodyFat: ProgressSummary["bodyFat"] = null;
  let smm:     ProgressSummary["smm"]     = null;

  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (goal) {
    const { data: pLogs } = await supabase
      .from("progress_logs")
      .select("logged_at, body_fat, smm")
      .eq("user_id", userId)
      .eq("goal_id", goal.id)
      .order("logged_at", { ascending: true });

    const bfPoints:  Point[] = [];
    const smmPoints: Point[] = [];

    for (const row of pLogs ?? []) {
      if (row.body_fat != null) bfPoints.push({ date: row.logged_at, value: Number(row.body_fat) });
      if (row.smm     != null) smmPoints.push({ date: row.logged_at, value: Number(row.smm) });
    }

    if (bfPoints.length >= 2) {
      bodyFat = {
        week:  buildDelta(bfPoints, weekTarget),
        month: buildDelta(bfPoints, monthTarget),
      };
    }

    if (smmPoints.length >= 2) {
      smm = {
        week:  buildDelta(smmPoints, weekTarget),
        month: buildDelta(smmPoints, monthTarget),
      };
    }
  }

  return { weight, bodyFat, smm };
}
