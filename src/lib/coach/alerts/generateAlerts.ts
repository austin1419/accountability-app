// ─────────────────────────────────────────────
// generateAlerts — deterministic alert engine
//
// Evaluates each client in the roster snapshot against
// a set of deterministic rules. Produces alerts that
// match the CoachAlert shape used by the UI.
//
// Input: roster snapshot + computed analytics
// Output: GeneratedAlert[] (same shape as CoachAlert)
//
// No database queries. No UI logic. Pure computation.
// ─────────────────────────────────────────────

import type { RosterClient } from "@/lib/supabase/queries/getCoachDashboard";
import type { ComplianceAverages, TrendClient } from "@/lib/coach/analytics/types";
import type { GeneratedAlert } from "./types";
import { SEVERITY_PRIORITY } from "./types";

interface AlertEngineInput {
  roster: RosterClient[];
  compliance: ComplianceAverages;
  declining: TrendClient[];
}

// ── Rule functions ───────────────────────────────────────────────
// Each rule evaluates one client and returns an alert or null.

function checkComplianceDrop(client: RosterClient): GeneratedAlert | null {
  const delta = client.seven_day_pct - client.thirty_day_pct;
  if (delta >= -10) return null;

  const severity = delta <= -25 ? "critical" : "warning";
  return {
    client_id: client.client_id,
    client_name: client.client_name,
    alert_type: "compliance_drop",
    alert_priority: SEVERITY_PRIORITY[severity],
    alert_message: `Compliance dropped ${Math.abs(delta)}pts in the last 7 days (${client.seven_day_pct}% vs ${client.thirty_day_pct}% 30-day).`,
    detail_value: `7d: ${client.seven_day_pct}% → 30d: ${client.thirty_day_pct}%`,
  };
}

function checkInactivityStreak(client: RosterClient): GeneratedAlert | null {
  if (client.days_since_active === null || client.days_since_active < 3) return null;

  const severity = client.days_since_active >= 7 ? "critical" : "warning";
  return {
    client_id: client.client_id,
    client_name: client.client_name,
    alert_type: "inactivity_streak",
    alert_priority: SEVERITY_PRIORITY[severity],
    alert_message: `No activity logged in ${client.days_since_active} day${client.days_since_active !== 1 ? "s" : ""}.`,
    detail_value: `Last active: ${client.last_task_log_date ?? "unknown"}`,
  };
}

function checkHighStress(client: RosterClient): GeneratedAlert | null {
  if (client.latest_stress === null || client.latest_stress < 7) return null;

  const severity = client.latest_stress >= 9 ? "critical" : "warning";
  return {
    client_id: client.client_id,
    client_name: client.client_name,
    alert_type: "high_stress_signal",
    alert_priority: SEVERITY_PRIORITY[severity],
    alert_message: `Reported stress level of ${client.latest_stress}/10.`,
    detail_value: `Stress: ${client.latest_stress}/10`,
  };
}

function checkLowEnergy(client: RosterClient): GeneratedAlert | null {
  if (client.latest_energy === null || client.latest_energy > 3) return null;

  const severity = client.latest_energy <= 1 ? "critical" : "warning";
  return {
    client_id: client.client_id,
    client_name: client.client_name,
    alert_type: "low_energy_signal",
    alert_priority: SEVERITY_PRIORITY[severity],
    alert_message: `Reported energy level of ${client.latest_energy}/10.`,
    detail_value: `Energy: ${client.latest_energy}/10`,
  };
}

function checkJournalGap(client: RosterClient): GeneratedAlert | null {
  if (client.has_journal_today) return null;
  if (client.latest_journal_date === null) {
    return {
      client_id: client.client_id,
      client_name: client.client_name,
      alert_type: "journal_gap",
      alert_priority: SEVERITY_PRIORITY.warning,
      alert_message: "No journal entries recorded.",
      detail_value: null,
    };
  }

  // Calculate days since last journal
  const lastDate = new Date(client.latest_journal_date);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince < 3) return null;

  const severity = daysSince >= 7 ? "critical" : "warning";
  return {
    client_id: client.client_id,
    client_name: client.client_name,
    alert_type: "journal_gap",
    alert_priority: SEVERITY_PRIORITY[severity],
    alert_message: `No journal entry in ${daysSince} days.`,
    detail_value: `Last journal: ${client.latest_journal_date}`,
  };
}

function checkStalledProgress(client: RosterClient): GeneratedAlert | null {
  // Client has flat compliance across all windows and it's low
  if (client.thirty_day_pct >= 60) return null;

  const delta7v30 = Math.abs(client.seven_day_pct - client.thirty_day_pct);
  const deltaTv7 = Math.abs(client.today_pct - client.seven_day_pct);

  // Stalled = minimal movement across windows while below threshold
  if (delta7v30 > 5 || deltaTv7 > 10) return null;

  return {
    client_id: client.client_id,
    client_name: client.client_name,
    alert_type: "stalled_goal_progress",
    alert_priority: SEVERITY_PRIORITY.warning,
    alert_message: `Compliance flat at ${client.thirty_day_pct}% across all time windows. No improvement trend detected.`,
    detail_value: `T: ${client.today_pct}% · 7d: ${client.seven_day_pct}% · 30d: ${client.thirty_day_pct}%`,
  };
}

// ── Engine ───────────────────────────────────────────────────────

const clientRules = [
  checkComplianceDrop,
  checkInactivityStreak,
  checkHighStress,
  checkLowEnergy,
  checkJournalGap,
  checkStalledProgress,
];

export function generateAlerts(input: AlertEngineInput): GeneratedAlert[] {
  const { roster } = input;
  const alerts: GeneratedAlert[] = [];

  for (const client of roster) {
    for (const rule of clientRules) {
      const alert = rule(client);
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  // Sort: critical first, then by client name for stable ordering
  alerts.sort((a, b) => {
    if (a.alert_priority !== b.alert_priority) return a.alert_priority - b.alert_priority;
    return a.client_name.localeCompare(b.client_name);
  });

  return alerts;
}
