// ─────────────────────────────────────────────
// getClientReport — SERVER ONLY
//
// Fetches and computes a single-client monthly
// report payload. Reuses existing query patterns.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { computeGoalProgress } from "@/lib/computeGoalProgress";
import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientReportData,
  ReportPillar,
  ReportDailyCompliance,
  ReportSignal,
  WeightPoint,
  StatusLabel,
} from "./types";

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Status logic ─────────────────────────────────────────────────

function computeStatusLabel(thirtyDayPct: number, sevenDayPct: number, daysSinceActive: number | null): StatusLabel {
  // Aligned with dashboard: gone_dark threshold = 3 days
  if (daysSinceActive !== null && daysSinceActive >= 3) return "critical";
  if (sevenDayPct >= COMPLIANCE_TARGET && thirtyDayPct >= COMPLIANCE_TARGET) return "thriving";
  if (thirtyDayPct >= 65) return "on_track";
  if (thirtyDayPct >= 40) return "needs_attention";
  if (thirtyDayPct >= 20) return "at_risk";
  return "critical";
}

function computeStatusHeadline(status: StatusLabel, sevenDayPct: number, thirtyDayPct: number, daysSinceActive: number | null): string {
  if (daysSinceActive !== null && daysSinceActive >= 5) {
    return `Client has been inactive for ${daysSinceActive} days. Outreach recommended.`;
  }
  const delta = sevenDayPct - thirtyDayPct;
  switch (status) {
    case "thriving":
      return delta >= 5
        ? "Excellent. Compliance is high and trending up."
        : "Strong and consistent. Habits are locked in.";
    case "on_track":
      return delta >= 5
        ? "Good trajectory. Recent week showing improvement."
        : "Steady progress. Maintaining moderate compliance.";
    case "needs_attention":
      return delta < -10
        ? "Compliance declining. Recent week weaker than average."
        : "Inconsistent adherence. Some pillars need focus.";
    case "at_risk":
      return "Low compliance. Multiple habits being missed regularly.";
    case "critical":
      return "Critically low engagement. Immediate intervention needed.";
  }
}

// ── Wins + Focus Areas ───────────────────────────────────────────

function computeWins(
  thirtyDayPct: number,
  sevenDayPct: number,
  pillars: ReportPillar[],
  goalProgress: number,
  weightHistory: WeightPoint[],
  goalCategory: string | null,
): string[] {
  const wins: string[] = [];

  if (thirtyDayPct >= 80) wins.push(`30-day compliance at ${thirtyDayPct}% — strong consistency.`);
  if (sevenDayPct > thirtyDayPct + 5) wins.push(`Recent 7-day compliance (${sevenDayPct}%) trending above 30-day average.`);

  const strongPillars = pillars.filter((p) => p.avgPct !== null && p.avgPct >= 80 && p.taskCount > 0);
  for (const p of strongPillars) {
    wins.push(`${p.label} pillar strong at ${p.avgPct}%.`);
  }

  if (goalProgress >= 50) wins.push(`Goal is ${goalProgress}% complete.`);

  if (goalCategory === "weight" && weightHistory.length >= 4) {
    const first = weightHistory[0].weight;
    const last = weightHistory[weightHistory.length - 1].weight;
    if (last < first) wins.push(`Weight trending down: ${first.toFixed(1)} → ${last.toFixed(1)} lbs.`);
  }

  return wins.slice(0, 5);
}

function computeFocusAreas(
  thirtyDayPct: number,
  sevenDayPct: number,
  pillars: ReportPillar[],
  daysSinceActive: number | null,
): string[] {
  const areas: string[] = [];

  if (daysSinceActive !== null && daysSinceActive >= 3) {
    areas.push(`Re-engage — last activity was ${daysSinceActive} days ago.`);
  }

  const weakPillars = pillars
    .filter((p) => p.avgPct !== null && p.avgPct < 50 && p.taskCount > 0)
    .sort((a, b) => (a.avgPct ?? 0) - (b.avgPct ?? 0));
  for (const p of weakPillars) {
    areas.push(`Improve ${p.label} — currently at ${p.avgPct}%.`);
  }

  if (sevenDayPct < thirtyDayPct - 10) {
    areas.push("Recent compliance dipping — address before it becomes a trend.");
  }

  if (thirtyDayPct < 50 && areas.length === 0) {
    areas.push("Overall compliance below 50%. Simplify habits or increase check-in frequency.");
  }

  return areas.slice(0, 4);
}

// ── Main fetcher ─────────────────────────────────────────────────

export async function getClientReport(
  clientId: string,
  coachName: string,
): Promise<ClientReportData | null> {
  const supabase = createAdminClient();

  const today = cstDate();
  const thirtyDaysAgo = cstDaysAgo(29);
  const sixDaysAgo = cstDaysAgo(6);

  // ── Step 1: Client + goal ──────────────────────────────────────

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

  // ── Step 2: Tasks + logs ───────────────────────────────────────

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
    .in("task_id", taskIds.length > 0 ? taskIds : [""])
    .limit(10000);

  const taskLogs = logs ?? [];
  const taskIdSet = new Set(taskIds);
  const filteredLogs = taskLogs.filter((l) => taskIdSet.has(l.task_id));

  // ── Step 3: Weight history ─────────────────────────────────────

  const { data: weightRows } = await supabase
    .from("weight_logs")
    .select("weight, logged_at")
    .eq("user_id", clientId)
    .gte("logged_at", thirtyDaysAgo)
    .order("logged_at", { ascending: true })
    .limit(100);

  const weightHistory: WeightPoint[] = (weightRows ?? []).map((r) => ({
    date: typeof r.logged_at === "string" ? r.logged_at.slice(0, 10) : r.logged_at,
    weight: r.weight,
  }));

  // ── Step 4: Compliance calculations ────────────────────────────

  // 30-day
  const totalCompleted30 = filteredLogs.filter((l) => l.completed).length;
  const totalExpected30 = taskCount * daysBetweenInclusive(thirtyDaysAgo, today);
  const thirtyDayPct = totalExpected30 > 0 ? Math.round((totalCompleted30 / totalExpected30) * 100) : 0;

  // 7-day
  const sevenDayLogs = filteredLogs.filter((l) => l.date >= sixDaysAgo);
  const totalCompleted7 = sevenDayLogs.filter((l) => l.completed).length;
  const totalExpected7 = taskCount * 7;
  const sevenDayPct = totalExpected7 > 0 ? Math.round((totalCompleted7 / totalExpected7) * 100) : 0;

  // Today
  const todayLogs = filteredLogs.filter((l) => l.date === today);
  const todayCompleted = todayLogs.filter((l) => l.completed).length;
  const todayPct = taskCount > 0 ? Math.round((todayCompleted / taskCount) * 100) : null;

  // Days since last activity
  const mostRecentCompleted = filteredLogs
    .filter((l) => l.completed)
    .reduce<string | null>((latest, l) => (!latest || l.date > latest ? l.date : latest), null);
  const daysSinceActive = mostRecentCompleted
    ? daysBetweenInclusive(mostRecentCompleted, today) - 1
    : (filteredLogs.length > 0 ? 30 : null);

  // ── Step 5: Goal progress + metrics ────────────────────────────

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

  // ── Step 6: Weekly trend (current week Sun–Sat) ────────────────

  const todayObj = new Date(today + "T12:00:00");
  const dayOfWeek = todayObj.getDay();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - dayOfWeek);

  const weeklyTrend: ReportDailyCompliance[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartObj);
    d.setDate(weekStartObj.getDate() + i);
    const dateStr = cstDate(d);

    if (dateStr > today) {
      weeklyTrend.push({ date: dateStr, dayLabel: DAY_LABELS[i], pct: null });
      continue;
    }

    const dayLogs = filteredLogs.filter((l) => l.date === dateStr);
    const done = dayLogs.filter((l) => l.completed).length;
    const pct = taskCount > 0 ? Math.round((done / taskCount) * 100) : null;
    weeklyTrend.push({ date: dateStr, dayLabel: DAY_LABELS[i], pct });
  }

  // ── Step 7: 30-day daily trend ─────────────────────────────────

  const thirtyDayTrend: ReportDailyCompliance[] = [];
  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const dateStr = cstDate(d);
    const dow = d.getDay();

    const dayLogs = filteredLogs.filter((l) => l.date === dateStr);
    const done = dayLogs.filter((l) => l.completed).length;
    const pct = taskCount > 0 ? Math.round((done / taskCount) * 100) : null;
    thirtyDayTrend.push({ date: dateStr, dayLabel: DAY_LABELS[dow], pct });
  }

  // ── Step 8: Pillar breakdown ───────────────────────────────────

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

  // ── Step 9: Status ─────────────────────────────────────────────

  const statusLabel = computeStatusLabel(thirtyDayPct, sevenDayPct, daysSinceActive);
  const statusHeadline = computeStatusHeadline(statusLabel, sevenDayPct, thirtyDayPct, daysSinceActive);

  // ── Step 10: Coaching signals ──────────────────────────────────

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

  if (!mostRecentCompleted) {
    signals.push({ dot: "crimson", text: "No completed tasks in the last 30 days." });
  } else if (daysSinceActive !== null && daysSinceActive >= 3) {
    signals.push({ dot: "gold", text: `Last activity was ${daysSinceActive} day${daysSinceActive !== 1 ? "s" : ""} ago.` });
  }

  if (signals.length === 0) {
    signals.push({ dot: "green", text: "No coaching signals to flag. Client is on track." });
  }

  // ── Step 11: Wins + Focus Areas ────────────────────────────────

  const wins = computeWins(thirtyDayPct, sevenDayPct, pillars, goalProgress, weightHistory, goal?.goal_category ?? null);
  const focusAreas = computeFocusAreas(thirtyDayPct, sevenDayPct, pillars, daysSinceActive);

  // ── Return ─────────────────────────────────────────────────────

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

    statusLabel,
    statusHeadline,
    daysSinceActive,

    todayPct,
    sevenDayPct,
    thirtyDayPct,
    weeklyTrend,
    thirtyDayTrend,
    pillars,

    weightHistory,
    currentWeight: goal?.current_weight ?? null,
    currentBodyFat: goal?.current_body_fat ?? null,
    currentSmm: goal?.current_smm ?? null,

    signals,
    wins,
    focusAreas,
  };
}
