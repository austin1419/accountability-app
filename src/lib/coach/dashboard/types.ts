// ─────────────────────────────────────────────
// Coach Dashboard — V1 types
//
// Single typed payload for the /coach dashboard page.
// All fields are precomputed server-side.
// ─────────────────────────────────────────────

/** Per-client compliance + status for roster classification. */
export interface DashboardClient {
  id: string;
  name: string;
  todayPct: number | null;
  sevenDayPct: number | null;
  thirtyDayPct: number | null;
  daysSinceActive: number | null;
  statusLabel: "thriving" | "at_risk" | "critical" | "gone_dark";
  goalName: string | null;
  goalCategory: string | null;
  goalId: string | null;
}

/** Roster status distribution counts. */
export interface RosterCounts {
  total: number;
  thriving: number;
  atRisk: number;
  critical: number;
  goneDark: number;
}

/** KPI strip counts for the dashboard header. */
export interface DashboardKPIs {
  clientsAtRisk: number;
  criticalAlerts: number;
  warningAlerts: number;
  interventionsToday: number;
  resolvedToday: number;
}

/** A single alert row enriched with client context. */
export interface DashboardAlert {
  clientId: string;
  clientName: string;
  alertType: string;
  status: string;
  updatedAt: string;
  interventionType: string | null;
  interventionNote: string | null;
  coachNote: string | null;
  followUpDate: string | null;
  resolvedAt: string | null;
  /** Client compliance context */
  todayPct: number | null;
  sevenDayPct: number | null;
  thirtyDayPct: number | null;
  daysSinceActive: number | null;
  statusLabel: "thriving" | "at_risk" | "critical" | "gone_dark";
  goalName: string | null;
  goalCategory: string | null;
}

/** Priority strip row (top 4). */
export interface PriorityItem {
  clientId: string;
  clientName: string;
  alertType: string;
  coachNote: string | null;
}

/** Recent intervention row. */
export interface RecentIntervention {
  clientId: string;
  clientName: string;
  interventionType: string;
  interventionNote: string;
  updatedAt: string;
}

/** Follow-up due row. */
export interface FollowUpDue {
  clientId: string;
  clientName: string;
  followUpDate: string;
  coachNote: string | null;
  status: string;
}

/** Pillar compliance average. */
export interface PillarBreakdown {
  pillar: string;
  label: string;
  avgPct: number | null;
  taskCount: number;
}

/** Daily roster compliance for trend display. */
export interface DailyCompliance {
  date: string;
  dayLabel: string;
  avgPct: number | null;
}

/** Deterministic coach insight. */
export interface CoachInsight {
  dot: "green" | "gold" | "crimson";
  text: string;
}

/** Full dashboard payload returned by getCoachDashboardData(). */
export interface CoachDashboardData {
  clients: DashboardClient[];
  roster: RosterCounts;
  kpis: DashboardKPIs;
  /** Top 4 priority alerts for the strip. */
  priorityItems: PriorityItem[];
  /** Clients with active (new/reviewed) alerts, sorted for attention queue. */
  attentionQueue: DashboardAlert[];
  /** Today's interventions, newest first, max 5. */
  recentInterventions: RecentIntervention[];
  /** Follow-ups due within 24 hours, soonest first. */
  followUpsDue: FollowUpDue[];
  /** Per-pillar compliance averages (30-day). */
  pillarBreakdown: PillarBreakdown[];
  /** Current week daily roster compliance (Sun–Sat). */
  weeklyTrend: DailyCompliance[];
  /** Deterministic coach insights. */
  coachInsights: CoachInsight[];
}
