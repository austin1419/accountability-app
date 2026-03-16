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

  thirtyDayPct: number;
  weeklyTrend: ReportDailyCompliance[];
  pillars: ReportPillar[];

  signals: ReportSignal[];
}
