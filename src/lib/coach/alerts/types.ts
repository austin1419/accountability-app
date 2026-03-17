// ─────────────────────────────────────────────
// Coach Alerts — shared types
//
// AlertType and AlertSeverity define the vocabulary.
// GeneratedAlert is the pure computation output.
// HydratedAlert extends it with persisted lifecycle state.
// ─────────────────────────────────────────────

/** Deterministic alert types the engine can produce. */
export type AlertType =
  | "compliance_drop"
  | "inactivity_streak"
  | "stalled_goal_progress"
  | "repeated_habit_failure"
  | "negative_body_metric_trend"
  | "high_stress_signal"
  | "low_energy_signal"
  | "journal_gap";

/** Severity levels mapped to alert_priority values. */
export type AlertSeverity = "critical" | "warning";

/** Alert lifecycle states. */
export type AlertStatus = "new" | "reviewed" | "action_taken" | "intervention" | "resolved";

/** Intervention types a coach can record. */
export type InterventionType =
  | "message_client"
  | "adjust_habit"
  | "schedule_call"
  | "review_progress"
  | "other";

/** Priority values by severity (matches RPC convention). */
export const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  critical: 1,
  warning: 2,
};

/** Human-readable labels for intervention types. */
export const INTERVENTION_LABELS: Record<InterventionType, string> = {
  message_client:  "Message Client",
  adjust_habit:    "Adjust Habit",
  schedule_call:   "Schedule Call",
  review_progress: "Review Progress",
  other:           "Other",
};

/**
 * Output shape for generated alerts (pure computation).
 * Identical to CoachAlert from getCoachDashboard.
 */
export interface GeneratedAlert {
  client_id: string;
  client_name: string;
  alert_type: string;
  alert_priority: number;
  alert_message: string;
  detail_value: string | null;
}

/**
 * Alert with persisted lifecycle state hydrated from
 * the coach_alert_state table. This is what the UI consumes.
 */
export interface HydratedAlert extends GeneratedAlert {
  status: AlertStatus;
  reviewed_at: string | null;
  resolved_at: string | null;
  coach_note: string | null;
  state_id: string | null;
  intervention_type: InterventionType | null;
  intervention_note: string | null;
  follow_up_date: string | null;
}
