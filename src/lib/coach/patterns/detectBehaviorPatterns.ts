// ─────────────────────────────────────────────
// detectBehaviorPatterns — deterministic pattern detection
//
// Analyzes existing signals (timeline events + compliance)
// to identify behavioral trends. Pure computation —
// no database queries, no UI logic.
//
// Input: timeline events + compliance metrics
// Output: BehaviorPattern[]
// ─────────────────────────────────────────────

import type { TimelineEvent } from "@/lib/coach/timeline/types";
import type { BehaviorPattern } from "./types";

export interface PatternDetectionInput {
  events: TimelineEvent[];
  todayPct: number;
  weekPct: number;
  monthPct: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function recentEvents(events: TimelineEvent[], type: string, days: number): TimelineEvent[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter(
    (e) => e.eventType === type && new Date(e.timestamp).getTime() >= cutoff,
  );
}

function journalMetricValues(events: TimelineEvent[], key: string): { value: number; id: string; ts: number }[] {
  return events
    .filter((e) => e.eventType === "journal_entry" && e.metadata?.[key] != null)
    .map((e) => ({
      value: Number(e.metadata![key]),
      id: e.id,
      ts: new Date(e.timestamp).getTime(),
    }))
    .sort((a, b) => a.ts - b.ts);
}

// ── Detectors ────────────────────────────────────────────────────

function detectHabitFailureCluster(input: PatternDetectionInput): BehaviorPattern | null {
  // Multiple alerts triggered in a short window = cluster of failures
  const recent = recentEvents(input.events, "alert_triggered", 7);
  if (recent.length < 3) return null;

  const severity = recent.length >= 5 ? "critical" as const : "warning" as const;
  return {
    patternType: "habit_failure_cluster",
    severity,
    summary: `${recent.length} alerts triggered in the last 7 days. This may indicate systemic non-compliance rather than isolated misses.`,
    confidenceScore: Math.min(0.5 + recent.length * 0.1, 0.95),
    relatedEventIds: recent.map((e) => e.id),
  };
}

function detectHabitStreak(input: PatternDetectionInput): BehaviorPattern | null {
  // Sustained high compliance across all windows
  if (input.todayPct < 80 || input.weekPct < 80 || input.monthPct < 75) return null;

  return {
    patternType: "habit_streak",
    severity: "positive",
    summary: `Compliance is strong across all windows (today ${input.todayPct}%, 7d ${input.weekPct}%, 30d ${input.monthPct}%). This client is in a sustained habit streak.`,
    confidenceScore: 0.85,
    relatedEventIds: [],
  };
}

function detectStressRising(input: PatternDetectionInput): BehaviorPattern | null {
  const entries = journalMetricValues(input.events, "stress");
  if (entries.length < 3) return null;

  // Look at the last 5 entries for a rising trend
  const recent = entries.slice(-5);
  if (recent.length < 3) return null;

  let risingCount = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].value > recent[i - 1].value) risingCount++;
  }

  if (risingCount < recent.length - 1) return null;

  const latestStress = recent[recent.length - 1].value;
  const severity = latestStress >= 8 ? "critical" as const : "warning" as const;

  return {
    patternType: "stress_rising",
    severity,
    summary: `Stress has been trending upward across the last ${recent.length} journal entries (latest: ${latestStress}/10). Consider proactive wellness check.`,
    confidenceScore: 0.6 + risingCount * 0.08,
    relatedEventIds: recent.map((e) => e.id),
  };
}

function detectEnergyDeclining(input: PatternDetectionInput): BehaviorPattern | null {
  const entries = journalMetricValues(input.events, "energy");
  if (entries.length < 3) return null;

  const recent = entries.slice(-5);
  if (recent.length < 3) return null;

  let decliningCount = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].value < recent[i - 1].value) decliningCount++;
  }

  if (decliningCount < recent.length - 1) return null;

  const latestEnergy = recent[recent.length - 1].value;
  const severity = latestEnergy <= 3 ? "critical" as const : "warning" as const;

  return {
    patternType: "energy_declining",
    severity,
    summary: `Energy has been declining across the last ${recent.length} journal entries (latest: ${latestEnergy}/10). Recovery or deload may be needed.`,
    confidenceScore: 0.6 + decliningCount * 0.08,
    relatedEventIds: recent.map((e) => e.id),
  };
}

function detectComplianceMomentum(input: PatternDetectionInput): BehaviorPattern | null {
  // 7-day significantly above 30-day = positive momentum
  const delta = input.weekPct - input.monthPct;
  if (delta < 10) return null;

  return {
    patternType: "compliance_momentum",
    severity: "positive",
    summary: `7-day compliance (${input.weekPct}%) is ${delta}pts above 30-day (${input.monthPct}%). Client is building positive momentum.`,
    confidenceScore: Math.min(0.6 + delta * 0.02, 0.9),
    relatedEventIds: [],
  };
}

function detectInterventionLoop(input: PatternDetectionInput): BehaviorPattern | null {
  // Multiple interventions in a short window without resolution
  const interventions = recentEvents(input.events, "intervention_taken", 14);
  const resolved = recentEvents(input.events, "alert_resolved", 14);

  if (interventions.length < 3) return null;
  if (resolved.length >= interventions.length) return null;

  const severity = interventions.length >= 5 ? "critical" as const : "warning" as const;

  return {
    patternType: "intervention_loop",
    severity,
    summary: `${interventions.length} interventions recorded in the last 14 days with only ${resolved.length} resolution${resolved.length !== 1 ? "s" : ""}. Current approach may not be effective.`,
    confidenceScore: Math.min(0.5 + (interventions.length - resolved.length) * 0.1, 0.9),
    relatedEventIds: interventions.map((e) => e.id),
  };
}

// ── Engine ───────────────────────────────────────────────────────

const detectors = [
  detectHabitFailureCluster,
  detectHabitStreak,
  detectStressRising,
  detectEnergyDeclining,
  detectComplianceMomentum,
  detectInterventionLoop,
];

export function detectBehaviorPatterns(input: PatternDetectionInput): BehaviorPattern[] {
  const patterns: BehaviorPattern[] = [];

  for (const detector of detectors) {
    const pattern = detector(input);
    if (pattern) {
      patterns.push(pattern);
    }
  }

  // Sort: critical first, then warning, neutral, positive
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    neutral: 2,
    positive: 3,
  };

  patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return patterns;
}
