// ─────────────────────────────────────────────
// generateCoachInsights — deterministic coaching signals
// ─────────────────────────────────────────────

import type { ComplianceAverages, CoachInsight } from "./types";

export function generateCoachInsights(
  compliance: ComplianceAverages,
  thriving: number,
  total: number,
  flaggedCount: number,
  noJournalTodayCount: number,
  decliningCount: number,
): CoachInsight[] {
  const insights: CoachInsight[] = [];

  if (flaggedCount > 0) {
    insights.push({
      icon: "◉",
      text: `${flaggedCount} client${flaggedCount !== 1 ? "s" : ""} flagged as critical or gone dark. Review the War Room for triage.`,
      accent: "crimson",
    });
  }

  const { sevenDay, thirtyDay } = compliance;

  if (sevenDay > thirtyDay + 5) {
    insights.push({
      icon: "△",
      text: `Roster compliance trending up — 7-day average (${sevenDay}%) is ${sevenDay - thirtyDay}pts above 30-day (${thirtyDay}%).`,
      accent: "green",
    });
  } else if (sevenDay < thirtyDay - 5) {
    insights.push({
      icon: "▽",
      text: `Roster compliance declining — 7-day average (${sevenDay}%) is ${thirtyDay - sevenDay}pts below 30-day (${thirtyDay}%).`,
      accent: "gold",
    });
  }

  if (thriving > total * 0.6 && total > 0) {
    insights.push({
      icon: "★",
      text: `${Math.round((thriving / total) * 100)}% of your roster is thriving. Strong coaching signal.`,
      accent: "green",
    });
  }

  if (noJournalTodayCount > total * 0.5 && total > 0) {
    insights.push({
      icon: "✎",
      text: `${noJournalTodayCount} of ${total} clients have not journaled today.`,
      accent: "neutral",
    });
  }

  if (decliningCount === 0 && flaggedCount === 0) {
    insights.push({
      icon: "◈",
      text: "No declining trends or critical flags. Roster is stable.",
      accent: "green",
    });
  }

  return insights;
}
