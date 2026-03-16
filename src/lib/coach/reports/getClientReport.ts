// ─────────────────────────────────────────────
// getClientReport — SERVER ONLY
//
// Fetches and computes a single-client monthly
// report payload. Reuses existing query patterns.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { computeGoalProgress } from "@/lib/computeGoalProgress";
import type { ClientReportData, ReportPillar, ReportDailyCompliance, ReportSignal } from "./types";

export type { ClientReportData } from "./types";

// ── Helpers ──────────────────────────────────────────────────────

function cstDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function cstDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return cstDate(d);
}

function daysBetweenInclusive(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86400000) + 1);
}

const PILLAR_MAP: Record<string, string> = {
  Activity:         "Labor",
  Nutrition:        "Nourish",
  "Sleep/Recovery": "Sabbath",
  Supplements:      "Tend",
};

// ── Main fetcher ─────────────────────────────────────────────────

export async function getClientReport(
  clientId: string,
  coachName: string,
): Promise<ClientReportData | null> {
  const supabase = createAdminClient();

  const today = cstDate();
  const thirtyDaysAgo = cstDaysAgo(29);

  // Step 1: Client + goal
  const { data: client } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return null;

  const { data: goals } = await supabase
    .from("goals")
    .select("id, goal_name, goal_category, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value, created_at")
    .eq("user_id", clientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const goal = goals?.[0] ?? null;

  // Step 2: Tasks + logs (parallel)
  const goalId = goal?.id;
  let taskRows: { id: string; category: string | null }[] = [];

  if (goalId) {
    const { data } = await supabase
      .from("tasks")
      .select("id, category")
      .eq("goal_id", goalId)
      .eq("is_active", true);
    taskRows = (data ?? []).map((t) => ({ id: t.id, category: t.category ?? null }));
  }

  const taskIds = taskRows.map((t) => t.id);
  const taskCount = taskIds.length;

  const { data: logs } = await supabase
    .from("task_logs")
    .select("task_id, date, completed")
    .eq("user_id", clientId)
    .gte("date", thirtyDaysAgo)
    .lte("date", today)
    .in("task_id", taskIds.length > 0 ? taskIds : [""]);

  const taskLogs = logs ?? [];
  const taskIdSet = new Set(taskIds);
  const filteredLogs = taskLogs.filter((l) => taskIdSet.has(l.task_id));

  // Step 3: 30-day compliance
  const totalCompleted = filteredLogs.filter((l) => l.completed).length;
  const totalExpected = taskCount * daysBetweenInclusive(thirtyDaysAgo, today);
  const thirtyDayPct = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

  // Step 4: Goal progress + metrics
  const goalProgress = goal ? computeGoalProgress(goal) : 0;

  const goalMetrics: ClientReportData["goalMetrics"] = [];
  if (goal) {
    if (goal.goal_category === "weight") {
      goalMetrics.push({ label: "Weight", start: goal.start_weight, current: goal.current_weight, target: goal.goal_weight, unit: "lbs" });
    } else if (goal.goal_category === "body_composition") {
      goalMetrics.push({ label: "Body Fat", start: goal.starting_body_fat, current: goal.current_body_fat, target: goal.goal_body_fat, unit: "%" });
      goalMetrics.push({ label: "SMM", start: goal.starting_smm, current: goal.current_smm, target: goal.goal_smm, unit: "lbs" });
    } else if (goal.goal_category === "performance") {
      goalMetrics.push({
        label: goal.performance_metric_name ?? "Performance",
        start: goal.starting_performance_value,
        current: goal.current_performance_value,
        target: goal.goal_performance_value,
        unit: goal.performance_unit ?? "",
      });
    }
  }

  // Step 5: Weekly trend (current week Sun–Sat)
  const todayObj = new Date(today + "T12:00:00");
  const dayOfWeek = todayObj.getDay();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - dayOfWeek);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeklyTrend: ReportDailyCompliance[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartObj);
    d.setDate(weekStartObj.getDate() + i);
    const dateStr = cstDate(d);

    if (dateStr > today) {
      weeklyTrend.push({ date: dateStr, dayLabel: dayLabels[i], pct: null });
      continue;
    }

    const dayLogs = filteredLogs.filter((l) => l.date === dateStr);
    const done = dayLogs.filter((l) => l.completed).length;
    const pct = taskCount > 0 ? Math.round((done / taskCount) * 100) : null;
    weeklyTrend.push({ date: dateStr, dayLabel: dayLabels[i], pct });
  }

  // Step 6: Pillar breakdown
  const taskCategoryMap = new Map<string, string | null>();
  for (const t of taskRows) {
    taskCategoryMap.set(t.id, t.category);
  }

  const pillarCompleted = new Map<string, number>();
  const pillarTotal = new Map<string, number>();

  for (const l of filteredLogs) {
    const cat = taskCategoryMap.get(l.task_id);
    if (!cat) continue;
    const pillar = PILLAR_MAP[cat];
    if (!pillar) continue;
    pillarTotal.set(pillar, (pillarTotal.get(pillar) ?? 0) + 1);
    if (l.completed) {
      pillarCompleted.set(pillar, (pillarCompleted.get(pillar) ?? 0) + 1);
    }
  }

  const pillars: ReportPillar[] = ["Labor", "Nourish", "Sabbath", "Tend"].map((label) => {
    const total = pillarTotal.get(label) ?? 0;
    const completed = pillarCompleted.get(label) ?? 0;
    return {
      label,
      avgPct: total > 0 ? Math.round((completed / total) * 100) : null,
      taskCount: total,
    };
  });

  // Step 7: Coaching signals (deterministic)
  const signals: ReportSignal[] = [];

  const weakestPillar = pillars
    .filter((p) => p.avgPct !== null && p.taskCount > 0)
    .reduce<ReportPillar | null>((w, p) => (!w || (p.avgPct ?? 100) < (w.avgPct ?? 100) ? p : w), null);

  if (weakestPillar && weakestPillar.avgPct !== null && weakestPillar.avgPct < 40) {
    signals.push({
      dot: "crimson",
      text: `${weakestPillar.label} is the weakest pillar at ${weakestPillar.avgPct}%.`,
    });
  }

  const monThu = weeklyTrend.filter((d) => ["Mon", "Tue", "Wed", "Thu"].includes(d.dayLabel) && d.pct !== null);
  const friSat = weeklyTrend.filter((d) => ["Fri", "Sat"].includes(d.dayLabel) && d.pct !== null);
  if (monThu.length > 0 && friSat.length > 0) {
    const mtAvg = Math.round(monThu.reduce((s, d) => s + d.pct!, 0) / monThu.length);
    const fsAvg = Math.round(friSat.reduce((s, d) => s + d.pct!, 0) / friSat.length);
    if (mtAvg - fsAvg >= 10) {
      signals.push({ dot: "gold", text: `Weekend compliance drops ${mtAvg - fsAvg}pts vs weekdays.` });
    }
  }

  if (thirtyDayPct >= 80) {
    signals.push({ dot: "green", text: `Strong 30-day compliance at ${thirtyDayPct}%.` });
  } else if (thirtyDayPct < 40) {
    signals.push({ dot: "crimson", text: `30-day compliance critically low at ${thirtyDayPct}%.` });
  }

  // Check for recent inactivity
  const mostRecentLog = filteredLogs
    .filter((l) => l.completed)
    .reduce<string | null>((latest, l) => (!latest || l.date > latest ? l.date : latest), null);

  if (!mostRecentLog) {
    signals.push({ dot: "crimson", text: "No completed tasks in the last 30 days." });
  } else {
    const daysSince = daysBetweenInclusive(mostRecentLog, today) - 1;
    if (daysSince >= 3) {
      signals.push({ dot: "gold", text: `Last activity was ${daysSince} day${daysSince !== 1 ? "s" : ""} ago.` });
    }
  }

  if (signals.length === 0) {
    signals.push({ dot: "green", text: "No coaching signals to flag. Client is on track." });
  }

  return {
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    coachName,
    periodStart: thirtyDaysAgo,
    periodEnd: today,
    goalName: goal?.goal_name ?? null,
    goalCategory: goal?.goal_category ?? null,
    goalProgress,
    goalMetrics,
    thirtyDayPct,
    weeklyTrend,
    pillars,
    signals,
  };
}
