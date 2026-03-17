// ─────────────────────────────────────────────
// Coach Reports — shared types
// ─────────────────────────────────────────────

export interface ReportPillar {
  label: string;
  avgPct: number | null;
  taskCount: number;
}

export interface ReportDailyCompliance {
  date: string;
  dayLabel: string;
  pct: number | null;
}

export interface ReportSignal {
  dot: "green" | "gold" | "crimson";
  text: string;
}

export interface WeightPoint {
  date: string;
  weight: number;
}

export type StatusLabel = "thriving" | "on_track" | "needs_attention" | "at_risk" | "critical";

export interface ClientReportData {
  clientId: string;
  clientName: string;
  clientEmail: string;
  coachName: string;
  periodStart: string;
  periodEnd: string;

  goalName: string | null;
  goalCategory: string | null;
  goalProgress: number;
  goalMetrics: {
    label: string;
    start: number | null;
    current: number | null;
    target: number | null;
    unit: string;
  }[];

  // Status
  statusLabel: StatusLabel;
  statusHeadline: string;
  daysSinceActive: number | null;

  // Compliance
  todayPct: number | null;
  sevenDayPct: number;
  thirtyDayPct: number;
  weeklyTrend: ReportDailyCompliance[];
  thirtyDayTrend: ReportDailyCompliance[];
  pillars: ReportPillar[];

  // Body metrics
  weightHistory: WeightPoint[];
  currentWeight: number | null;
  currentBodyFat: number | null;
  currentSmm: number | null;

  // Signals + insights
  signals: ReportSignal[];
  wins: string[];
  focusAreas: string[];
}
