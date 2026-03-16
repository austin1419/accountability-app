// ─────────────────────────────────────────────
// computeCoachDashboardMetrics — pure computation
//
// Derives per-client compliance, status labels, roster
// counts, KPI aggregates, and action surface data
// from raw query results.
// No database access. No side effects.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  DashboardClient,
  DashboardAlert,
  RosterCounts,
  DashboardKPIs,
  PriorityItem,
  RecentIntervention,
  FollowUpDue,
  PillarBreakdown,
  DailyCompliance,
  CoachInsight,
  CoachDashboardData,
} from "./types";

// ── Input types (raw query rows) ─────────────────────────────────

export interface RawClient {
  id: string;
  name: string;
}

export interface RawGoal {
  id: string;
  user_id: string;
  goal_name: string;
  goal_category: string | null;
  created_at: string;
}

export interface RawTaskLog {
  user_id: string;
  task_id: string;
  date: string;
  completed: boolean;
}

export interface RawTask {
  id: string;
  goal_id: string;
  category: string | null;
}

export interface RawAlertState {
  client_id: string;
  alert_type: string;
  status: string;
  resolved_at: string | null;
  updated_at: string;
  intervention_type: string | null;
  intervention_note: string | null;
  coach_note: string | null;
  follow_up_date: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────

function cstToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function daysBetweenInclusive(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86400000) + 1);
}

function safeCompliance(completed: number, expected: number): number | null {
  if (expected === 0) return null;
  return Math.round((completed / expected) * 100);
}

function deriveStatusLabel(
  sevenDayPct: number | null,
  daysSinceActive: number | null,
): "thriving" | "at_risk" | "critical" | "gone_dark" {
  if (daysSinceActive === null || daysSinceActive >= 3) return "gone_dark";
  const pct = sevenDayPct ?? 0;
  if (pct < 40) return "critical";
  if (pct < COMPLIANCE_TARGET) return "at_risk";
  return "thriving";
}

function isToday(ts: string | null): boolean {
  if (!ts) return false;
  const today = cstToday();
  return ts.startsWith(today);
}

const CRITICAL_ALERT_TYPES = new Set([
  "compliance_drop",
  "inactivity_streak",
  "high_stress_signal",
]);

// ── Main computation ─────────────────────────────────────────────

export function computeCoachDashboardMetrics(input: {
  clients: RawClient[];
  goals: RawGoal[];
  tasks: RawTask[];
  taskLogs: RawTaskLog[];
  alertStates: RawAlertState[];
}): CoachDashboardData {
  const { clients, goals, tasks, taskLogs, alertStates } = input;

  const today = cstToday();
  const sevenDayStart = daysAgo(6);
  const thirtyDayStart = daysAgo(29);

  // Goal lookup: most recent active goal per client
  const goalByClient = new Map<string, RawGoal>();
  for (const g of goals) {
    const existing = goalByClient.get(g.user_id);
    if (!existing || g.created_at > existing.created_at) {
      goalByClient.set(g.user_id, g);
    }
  }

  // Tasks by goal for task count
  const tasksByGoal = new Map<string, string[]>();
  for (const t of tasks) {
    const arr = tasksByGoal.get(t.goal_id) ?? [];
    arr.push(t.id);
    tasksByGoal.set(t.goal_id, arr);
  }

  // Task logs indexed by user_id
  const logsByUser = new Map<string, RawTaskLog[]>();
  for (const l of taskLogs) {
    const arr = logsByUser.get(l.user_id) ?? [];
    arr.push(l);
    logsByUser.set(l.user_id, arr);
  }

  // Build per-client metrics
  const dashboardClients: DashboardClient[] = clients.map((c) => {
    const goal = goalByClient.get(c.id) ?? null;
    const goalTaskIds = goal ? (tasksByGoal.get(goal.id) ?? []) : [];
    const taskCount = goalTaskIds.length;
    const taskIdSet = new Set(goalTaskIds);
    const userLogs = (logsByUser.get(c.id) ?? []).filter((l) => taskIdSet.has(l.task_id));

    const todayLogs = userLogs.filter((l) => l.date === today);
    const todayDone = todayLogs.filter((l) => l.completed).length;
    const todayPct = safeCompliance(todayDone, taskCount);

    const weekLogs = userLogs.filter((l) => l.date >= sevenDayStart && l.date <= today);
    const weekDone = weekLogs.filter((l) => l.completed).length;
    const weekExpected = taskCount * daysBetweenInclusive(sevenDayStart, today);
    const sevenDayPct = safeCompliance(weekDone, weekExpected);

    const monthLogs = userLogs.filter((l) => l.date >= thirtyDayStart && l.date <= today);
    const monthDone = monthLogs.filter((l) => l.completed).length;
    const monthExpected = taskCount * daysBetweenInclusive(thirtyDayStart, today);
    const thirtyDayPct = safeCompliance(monthDone, monthExpected);

    const mostRecentLog = userLogs
      .filter((l) => l.completed)
      .reduce<string | null>((latest, l) => (!latest || l.date > latest ? l.date : latest), null);

    let daysSinceActive: number | null = null;
    if (mostRecentLog) {
      daysSinceActive = daysBetweenInclusive(mostRecentLog, today) - 1;
    }

    return {
      id: c.id,
      name: c.name,
      todayPct,
      sevenDayPct,
      thirtyDayPct,
      daysSinceActive,
      statusLabel: deriveStatusLabel(sevenDayPct, daysSinceActive),
      goalName: goal?.goal_name ?? null,
      goalCategory: goal?.goal_category ?? null,
      goalId: goal?.id ?? null,
    };
  });

  // Client lookup for enriching alerts
  const clientMap = new Map<string, DashboardClient>();
  for (const c of dashboardClients) {
    clientMap.set(c.id, c);
  }

  // Roster counts
  const roster: RosterCounts = {
    total: dashboardClients.length,
    thriving: dashboardClients.filter((c) => c.statusLabel === "thriving").length,
    atRisk: dashboardClients.filter((c) => c.statusLabel === "at_risk").length,
    critical: dashboardClients.filter((c) => c.statusLabel === "critical").length,
    goneDark: dashboardClients.filter((c) => c.statusLabel === "gone_dark").length,
  };

  // ── KPI counts ─────────────────────────────────────────────────

  const activeAlerts = alertStates.filter((a) => a.status !== "resolved");
  const clientsWithActiveAlerts = new Set(activeAlerts.map((a) => a.client_id));

  const kpis: DashboardKPIs = {
    clientsAtRisk: clientsWithActiveAlerts.size,
    criticalAlerts: activeAlerts.filter((a) => CRITICAL_ALERT_TYPES.has(a.alert_type)).length,
    warningAlerts: activeAlerts.filter((a) => !CRITICAL_ALERT_TYPES.has(a.alert_type)).length,
    interventionsToday: alertStates.filter(
      (a) => a.status === "action_taken" && a.intervention_type != null && isToday(a.updated_at),
    ).length,
    resolvedToday: alertStates.filter(
      (a) => a.status === "resolved" && isToday(a.resolved_at),
    ).length,
  };

  // ── Priority Strip (top 4) ─────────────────────────────────────

  const prioritySorted = [...activeAlerts].sort((a, b) => {
    const cA = clientMap.get(a.client_id);
    const cB = clientMap.get(b.client_id);
    // gone_dark with days_since_active > 7 first
    const gdA = (cA?.statusLabel === "gone_dark" && (cA.daysSinceActive ?? 99) > 7) ? 0 : 1;
    const gdB = (cB?.statusLabel === "gone_dark" && (cB.daysSinceActive ?? 99) > 7) ? 0 : 1;
    if (gdA !== gdB) return gdA - gdB;
    // critical alert types next
    const crA = CRITICAL_ALERT_TYPES.has(a.alert_type) ? 0 : 1;
    const crB = CRITICAL_ALERT_TYPES.has(b.alert_type) ? 0 : 1;
    if (crA !== crB) return crA - crB;
    // newest first
    return b.updated_at.localeCompare(a.updated_at);
  });

  const priorityItems: PriorityItem[] = prioritySorted.slice(0, 4).map((a) => ({
    clientId: a.client_id,
    clientName: clientMap.get(a.client_id)?.name ?? "Unknown",
    alertType: a.alert_type,
    coachNote: a.coach_note,
  }));

  // ── Attention Queue ────────────────────────────────────────────

  const actionableAlerts = alertStates.filter(
    (a) => a.status === "new" || a.status === "reviewed",
  );

  const attentionSorted: DashboardAlert[] = actionableAlerts
    .map((a) => {
      const c = clientMap.get(a.client_id);
      return {
        clientId: a.client_id,
        clientName: c?.name ?? "Unknown",
        alertType: a.alert_type,
        status: a.status,
        updatedAt: a.updated_at,
        interventionType: a.intervention_type,
        interventionNote: a.intervention_note,
        coachNote: a.coach_note,
        followUpDate: a.follow_up_date,
        resolvedAt: a.resolved_at,
        todayPct: c?.todayPct ?? null,
        sevenDayPct: c?.sevenDayPct ?? null,
        thirtyDayPct: c?.thirtyDayPct ?? null,
        daysSinceActive: c?.daysSinceActive ?? null,
        statusLabel: c?.statusLabel ?? "gone_dark",
        goalName: c?.goalName ?? null,
        goalCategory: c?.goalCategory ?? null,
      };
    })
    .sort((a, b) => {
      // gone_dark first
      const gdA = a.statusLabel === "gone_dark" ? 0 : 1;
      const gdB = b.statusLabel === "gone_dark" ? 0 : 1;
      if (gdA !== gdB) return gdA - gdB;
      // critical alerts next
      const crA = CRITICAL_ALERT_TYPES.has(a.alertType) ? 0 : 1;
      const crB = CRITICAL_ALERT_TYPES.has(b.alertType) ? 0 : 1;
      if (crA !== crB) return crA - crB;
      // lowest thirty_day_pct
      const pctA = a.thirtyDayPct ?? 0;
      const pctB = b.thirtyDayPct ?? 0;
      if (pctA !== pctB) return pctA - pctB;
      // newest alert
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  // ── Recent Interventions (today, max 5) ────────────────────────

  const recentInterventions: RecentIntervention[] = alertStates
    .filter((a) => a.intervention_note != null && isToday(a.updated_at))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
    .map((a) => ({
      clientId: a.client_id,
      clientName: clientMap.get(a.client_id)?.name ?? "Unknown",
      interventionType: a.intervention_type ?? "other",
      interventionNote: a.intervention_note!,
      updatedAt: a.updated_at,
    }));

  // ── Follow-Ups Due (within 24h, not resolved) ─────────────────

  const now = Date.now();
  const twentyFourHoursFromNow = now + 24 * 60 * 60 * 1000;

  const followUpsDue: FollowUpDue[] = alertStates
    .filter((a) => {
      if (!a.follow_up_date || a.status === "resolved") return false;
      const fuTime = new Date(a.follow_up_date).getTime();
      return fuTime <= twentyFourHoursFromNow;
    })
    .sort((a, b) => a.follow_up_date!.localeCompare(b.follow_up_date!))
    .map((a) => ({
      clientId: a.client_id,
      clientName: clientMap.get(a.client_id)?.name ?? "Unknown",
      followUpDate: a.follow_up_date!,
      coachNote: a.coach_note,
      status: a.status,
    }));

  // ── Pillar Breakdown (30-day) ──────────────────────────────────

  const PILLAR_MAP: Record<string, string> = {
    Activity:         "Labor",
    Nutrition:        "Nourish",
    "Sleep/Recovery": "Sabbath",
    Supplements:      "Tend",
  };

  const taskCategoryMap = new Map<string, string | null>();
  for (const t of tasks) {
    taskCategoryMap.set(t.id, t.category);
  }

  // Group 30-day logs by pillar
  const pillarCompleted = new Map<string, number>();
  const pillarTotal = new Map<string, number>();

  for (const l of taskLogs) {
    if (l.date < thirtyDayStart || l.date > today) continue;
    const cat = taskCategoryMap.get(l.task_id);
    if (!cat) continue;
    const pillar = PILLAR_MAP[cat];
    if (!pillar) continue;
    pillarTotal.set(pillar, (pillarTotal.get(pillar) ?? 0) + 1);
    if (l.completed) {
      pillarCompleted.set(pillar, (pillarCompleted.get(pillar) ?? 0) + 1);
    }
  }

  const pillarBreakdown: PillarBreakdown[] = ["Labor", "Nourish", "Sabbath", "Tend"].map((label) => {
    const total = pillarTotal.get(label) ?? 0;
    const completed = pillarCompleted.get(label) ?? 0;
    return {
      pillar: label.toLowerCase(),
      label,
      avgPct: total > 0 ? Math.round((completed / total) * 100) : null,
      taskCount: total,
    };
  });

  // ── Weekly Compliance Trend (current week Sun–Sat) ─────────────

  const todayObj = new Date(today + "T12:00:00");
  const dayOfWeek = todayObj.getDay(); // 0=Sun
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - dayOfWeek);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyTrend: DailyCompliance[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartObj);
    d.setDate(weekStartObj.getDate() + i);
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

    if (dateStr > today) {
      weeklyTrend.push({ date: dateStr, dayLabel: dayLabels[i], avgPct: null });
      continue;
    }

    // Roster average for this day
    let totalPct = 0;
    let clientsWithData = 0;

    for (const client of dashboardClients) {
      const goal = goalByClient.get(client.id);
      if (!goal) continue;
      const goalTaskIds = tasksByGoal.get(goal.id) ?? [];
      const taskCount = goalTaskIds.length;
      if (taskCount === 0) continue;
      const taskIdSet = new Set(goalTaskIds);

      const dayLogs = (logsByUser.get(client.id) ?? []).filter(
        (l) => l.date === dateStr && taskIdSet.has(l.task_id),
      );
      const done = dayLogs.filter((l) => l.completed).length;
      totalPct += Math.round((done / taskCount) * 100);
      clientsWithData++;
    }

    weeklyTrend.push({
      date: dateStr,
      dayLabel: dayLabels[i],
      avgPct: clientsWithData > 0 ? Math.round(totalPct / clientsWithData) : null,
    });
  }

  // ── Coach Insights (deterministic) ─────────────────────────────

  const coachInsights: CoachInsight[] = [];

  // Weakest pillar insight
  const activePillars = pillarBreakdown.filter((p) => p.avgPct !== null && p.taskCount > 0);
  const weakestPillar = activePillars.reduce<PillarBreakdown | null>(
    (weakest, p) => (!weakest || (p.avgPct ?? 100) < (weakest.avgPct ?? 100) ? p : weakest),
    null,
  );
  if (weakestPillar && weakestPillar.avgPct !== null && weakestPillar.avgPct < 40) {
    coachInsights.push({
      dot: "crimson",
      text: `${weakestPillar.label} is the weakest pillar at ${weakestPillar.avgPct}% — consider reviewing ${weakestPillar.label.toLowerCase()} habits across the roster.`,
    });
  }

  // Weekend drop insight
  const monThu = weeklyTrend.filter((d) => ["Mon", "Tue", "Wed", "Thu"].includes(d.dayLabel) && d.avgPct !== null);
  const friSat = weeklyTrend.filter((d) => ["Fri", "Sat"].includes(d.dayLabel) && d.avgPct !== null);
  if (monThu.length > 0 && friSat.length > 0) {
    const monThuAvg = Math.round(monThu.reduce((s, d) => s + d.avgPct!, 0) / monThu.length);
    const friSatAvg = Math.round(friSat.reduce((s, d) => s + d.avgPct!, 0) / friSat.length);
    if (monThuAvg - friSatAvg >= 10) {
      coachInsights.push({
        dot: "gold",
        text: `Weekend compliance drops ${monThuAvg - friSatAvg}pts vs weekdays (${friSatAvg}% Fri–Sat vs ${monThuAvg}% Mon–Thu). Consider lighter weekend plans.`,
      });
    }
  }

  // Gone dark insight
  const goneDarkClients = dashboardClients.filter(
    (c) => c.statusLabel === "gone_dark" && (c.daysSinceActive === null || c.daysSinceActive > 7),
  );
  if (goneDarkClients.length > 0) {
    const names = goneDarkClients.slice(0, 3).map((c) => c.name).join(", ");
    const suffix = goneDarkClients.length > 3 ? ` and ${goneDarkClients.length - 3} more` : "";
    coachInsights.push({
      dot: "crimson",
      text: `${goneDarkClients.length} client${goneDarkClients.length !== 1 ? "s" : ""} gone dark (7+ days inactive): ${names}${suffix}.`,
    });
  }

  // All stable insight (if nothing else triggered)
  if (coachInsights.length === 0) {
    coachInsights.push({
      dot: "green",
      text: "No critical patterns detected. Roster is stable.",
    });
  }

  return {
    clients: dashboardClients,
    roster,
    kpis,
    priorityItems,
    attentionQueue: attentionSorted,
    recentInterventions,
    followUpsDue,
    pillarBreakdown,
    weeklyTrend,
    coachInsights,
  };
}
