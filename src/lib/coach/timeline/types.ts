// ─────────────────────────────────────────────
// Client Timeline — shared types
// ─────────────────────────────────────────────

export type TimelineEventType =
  | "alert_triggered"
  | "alert_reviewed"
  | "intervention_taken"
  | "alert_resolved"
  | "note_added"
  | "journal_entry"
  | "metric_update"
  | "weight_update";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: TimelineEventType;
  icon: string;
  summary: string;
  metadata?: Record<string, string | number | null>;
}
