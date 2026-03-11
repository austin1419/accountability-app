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

export type DashboardData = {
  clientName: string;
  goal: {
    goal_name:      string;
    start_weight:   number | null;
    goal_weight:    number | null;
    current_weight: number | null;
  } | null;
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
  goal: {
    id:             string;
    goal_name:      string;
    goal_date:      string | null;
    start_weight:   number | null;
    goal_weight:    number | null;
    current_weight: number | null;
    goalProgress:   number;
  } | null;
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
    .select("goal_name, start_weight, goal_weight, current_weight, id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
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
    .eq("role", "client");

  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: goals } = await supabase
    .from("goals")
    .select("id, user_id, goal_name, start_weight, goal_weight, current_weight")
    .in("user_id", clientIds)
    .order("created_at", { ascending: false });

  const goalByUser = new Map<string, NonNullable<typeof goals>[number]>();
  for (const g of goals ?? []) {
    if (!goalByUser.has(g.user_id)) goalByUser.set(g.user_id, g);
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

    const goalProgress =
      goal?.start_weight != null && goal?.current_weight != null && goal?.goal_weight != null &&
      goal.start_weight - goal.goal_weight > 0
        ? Math.min(Math.max(Math.round(
            ((goal.start_weight - goal.current_weight) / (goal.start_weight - goal.goal_weight)) * 100
          ), 0), 100)
        : 0;

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
    .order("name", { ascending: true });

  if (clientsError) console.error("[fetchAllClientsForCoach] users query failed:", clientsError);
  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: goals } = await supabase
    .from("goals")
    .select("id, user_id, goal_name, start_weight, goal_weight, current_weight")
    .in("user_id", clientIds)
    .order("created_at", { ascending: false });

  const goalByUser = new Map<string, NonNullable<typeof goals>[number]>();
  for (const g of goals ?? []) {
    if (!goalByUser.has(g.user_id)) goalByUser.set(g.user_id, g);
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

    const goalProgress =
      goal?.start_weight != null && goal?.current_weight != null && goal?.goal_weight != null &&
      goal.start_weight - goal.goal_weight > 0
        ? Math.min(Math.max(Math.round(
            ((goal.start_weight - goal.current_weight) / (goal.start_weight - goal.goal_weight)) * 100
          ), 0), 100)
        : 0;

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
    .select("id, goal_name, goal_date, start_weight, goal_weight, current_weight")
    .eq("user_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
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

  const goalProgress =
    goal?.start_weight != null && goal?.current_weight != null && goal?.goal_weight != null &&
    goal.start_weight - goal.goal_weight > 0
      ? Math.min(Math.max(Math.round(
          ((goal.start_weight - goal.current_weight) / (goal.start_weight - goal.goal_weight)) * 100
        ), 0), 100)
      : 0;

  return {
    id:    user.id,
    name:  user.name,
    email: user.email,
    phone: user.phone_number ?? null,
    goal: goal
      ? {
          id:             goal.id,
          goal_name:      goal.goal_name,
          goal_date:      goal.goal_date ?? null,
          start_weight:   goal.start_weight ?? null,
          goal_weight:    goal.goal_weight ?? null,
          current_weight: goal.current_weight ?? null,
          goalProgress,
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
