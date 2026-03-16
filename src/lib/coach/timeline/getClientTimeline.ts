// ─────────────────────────────────────────────
// getClientTimeline — SERVER ONLY
//
// Fetches timeline events from multiple data sources
// for a single client. Merges and sorts by timestamp
// descending. No business logic — just data assembly.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import type { TimelineEvent } from "./types";
import { INTERVENTION_LABELS } from "@/lib/coach/alerts/types";
import type { InterventionType } from "@/lib/coach/alerts/types";

// ── Untyped table helper (tables not in generated types) ─────────

type UntypedFrom = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };
};

const LIMIT = 50;

// ── Fetchers ─────────────────────────────────────────────────────

async function fetchAlertEvents(clientId: string): Promise<TimelineEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("coach_alert_state")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(LIMIT);

  if (error || !data) return [];

  const events: TimelineEvent[] = [];
  for (const raw of data as Record<string, unknown>[]) {
    const alertType = String(raw.alert_type ?? "").replace(/_/g, " ");
    const status = String(raw.status);
    const id = String(raw.id);

    // Alert triggered (creation)
    events.push({
      id: `${id}-created`,
      timestamp: String(raw.created_at),
      eventType: "alert_triggered",
      icon: "◉",
      summary: `Alert triggered: ${alertType}`,
      metadata: { alert_type: String(raw.alert_type), status },
    });

    // Alert reviewed
    if (raw.reviewed_at) {
      events.push({
        id: `${id}-reviewed`,
        timestamp: String(raw.reviewed_at),
        eventType: "alert_reviewed",
        icon: "◎",
        summary: `Alert reviewed: ${alertType}`,
      });
    }

    // Intervention taken
    if (raw.intervention_type) {
      const intLabel = INTERVENTION_LABELS[raw.intervention_type as InterventionType] ?? String(raw.intervention_type);
      events.push({
        id: `${id}-intervention`,
        timestamp: String(raw.updated_at),
        eventType: "intervention_taken",
        icon: "▸",
        summary: `Intervention: ${intLabel}`,
        metadata: {
          intervention_type: String(raw.intervention_type),
          intervention_note: raw.intervention_note ? String(raw.intervention_note) : null,
          follow_up_date: raw.follow_up_date ? String(raw.follow_up_date) : null,
        },
      });
    }

    // Alert resolved
    if (raw.resolved_at) {
      events.push({
        id: `${id}-resolved`,
        timestamp: String(raw.resolved_at),
        eventType: "alert_resolved",
        icon: "✓",
        summary: `Alert resolved: ${alertType}`,
      });
    }
  }

  return events;
}

async function fetchNoteEvents(clientId: string): Promise<TimelineEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, note, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error || !data) return [];

  return data.map((row) => ({
    id: `note-${row.id}`,
    timestamp: row.created_at,
    eventType: "note_added" as const,
    icon: "✎",
    summary: row.note.length > 120 ? row.note.slice(0, 120) + "…" : row.note,
  }));
}

async function fetchJournalEvents(clientId: string): Promise<TimelineEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("daily_journal")
    .select("id, date, stress_level, energy_level, notes, created_at")
    .eq("user_id", clientId)
    .order("date", { ascending: false })
    .limit(LIMIT);

  if (error || !data) return [];

  return data.map((row) => {
    const parts: string[] = [];
    if (row.stress_level !== null) parts.push(`stress ${row.stress_level}/10`);
    if (row.energy_level !== null) parts.push(`energy ${row.energy_level}/10`);
    const signals = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    const note = row.notes ? `: ${row.notes.length > 80 ? row.notes.slice(0, 80) + "…" : row.notes}` : "";

    return {
      id: `journal-${row.id}`,
      timestamp: row.created_at,
      eventType: "journal_entry" as const,
      icon: "☽",
      summary: `Journal entry for ${row.date}${signals}${note}`,
      metadata: {
        stress: row.stress_level,
        energy: row.energy_level,
      },
    };
  });
}

async function fetchWeightEvents(clientId: string): Promise<TimelineEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weight_logs")
    .select("id, weight, logged_at, created_at")
    .eq("user_id", clientId)
    .order("logged_at", { ascending: false })
    .limit(LIMIT);

  if (error || !data) return [];

  return data.map((row) => ({
    id: `weight-${row.id}`,
    timestamp: row.created_at,
    eventType: "weight_update" as const,
    icon: "△",
    summary: `Weight logged: ${row.weight} lbs on ${row.logged_at}`,
    metadata: { weight: Number(row.weight) },
  }));
}

async function fetchMetricEvents(clientId: string): Promise<TimelineEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("progress_logs")
    .select("id, logged_at, body_fat, smm, performance_value, created_at")
    .eq("user_id", clientId)
    .order("logged_at", { ascending: false })
    .limit(LIMIT);

  if (error || !data) return [];

  return data.map((row) => {
    const parts: string[] = [];
    if (row.body_fat !== null) parts.push(`BF ${row.body_fat}%`);
    if (row.smm !== null) parts.push(`SMM ${row.smm} lbs`);
    if (row.performance_value !== null) parts.push(`perf ${row.performance_value}`);

    return {
      id: `metric-${row.id}`,
      timestamp: row.created_at,
      eventType: "metric_update" as const,
      icon: "◈",
      summary: `Metrics updated on ${row.logged_at}: ${parts.join(", ") || "entry logged"}`,
      metadata: {
        body_fat: row.body_fat !== null ? Number(row.body_fat) : null,
        smm: row.smm !== null ? Number(row.smm) : null,
      },
    };
  });
}

// ── Public API ───────────────────────────────────────────────────

export async function getClientTimeline(
  clientId: string,
): Promise<TimelineEvent[]> {
  const [alerts, notes, journals, weights, metrics] = await Promise.all([
    fetchAlertEvents(clientId),
    fetchNoteEvents(clientId),
    fetchJournalEvents(clientId),
    fetchWeightEvents(clientId),
    fetchMetricEvents(clientId),
  ]);

  const all = [...alerts, ...notes, ...journals, ...weights, ...metrics];

  // Sort by timestamp descending (newest first)
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Cap total events
  return all.slice(0, 100);
}
