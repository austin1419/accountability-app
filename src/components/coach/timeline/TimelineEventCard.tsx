// ─────────────────────────────────────────────
// TimelineEventCard — single event in the timeline
// ─────────────────────────────────────────────

import type { TimelineEvent, TimelineEventType } from "@/lib/coach/timeline/types";

const eventColors: Record<TimelineEventType, string> = {
  alert_triggered:   "#7A1E1E",
  alert_reviewed:    "#B8933A",
  intervention_taken: "#B8933A",
  alert_resolved:    "#1D9E75",
  note_added:        "#B8933A",
  journal_entry:     "#807868",
  metric_update:     "#1D9E75",
  weight_update:     "#807868",
};

const eventLabels: Record<TimelineEventType, string> = {
  alert_triggered:   "Alert",
  alert_reviewed:    "Reviewed",
  intervention_taken: "Intervention",
  alert_resolved:    "Resolved",
  note_added:        "Note",
  journal_entry:     "Journal",
  metric_update:     "Metric",
  weight_update:     "Weight",
};

interface TimelineEventCardProps {
  event: TimelineEvent;
}

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  const color = eventColors[event.eventType];
  const label = eventLabels[event.eventType];

  const dateStr = new Date(event.timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="relative pb-4 last:pb-0 pl-4">
      {/* Timeline dot */}
      <div
        className="absolute rounded-full"
        style={{
          width: "6px",
          height: "6px",
          background: color,
          left: "-19px",
          top: "6px",
        }}
      />

      {/* Date + event type label */}
      <div className="flex items-center gap-2 mb-0.5">
        <span
          style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868" }}
        >
          {dateStr} {timeStr}
        </span>
        <span
          className="rounded border uppercase"
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "6px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color,
            borderColor: color,
            padding: "1px 5px",
            opacity: 0.8,
          }}
        >
          {label}
        </span>
      </div>

      {/* Icon + Summary */}
      <div className="flex items-start gap-1.5">
        <span style={{ fontSize: "10px", color, lineHeight: 1.6, flexShrink: 0 }}>
          {event.icon}
        </span>
        <p
          style={{
            fontFamily: "'EB Garamond', serif",
            fontSize: "12px",
            color: "#DDD5C0",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {event.summary}
        </p>
      </div>

      {/* Intervention metadata */}
      {event.eventType === "intervention_taken" && event.metadata && (
        <div className="mt-1 ml-4">
          {event.metadata.intervention_note && (
            <p
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#807868", lineHeight: 1.4 }}
            >
              {String(event.metadata.intervention_note)}
            </p>
          )}
          {event.metadata.follow_up_date && (
            <p
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", color: "#B8933A", marginTop: "2px" }}
            >
              Follow-up: {new Date(String(event.metadata.follow_up_date)).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Journal metadata */}
      {event.eventType === "journal_entry" && event.metadata && (
        <div className="flex items-center gap-2 mt-0.5 ml-4">
          {event.metadata.stress !== null && (
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "7px",
                fontWeight: 700,
                color: Number(event.metadata.stress) >= 7 ? "#7A1E1E" : "#807868",
              }}
            >
              S:{String(event.metadata.stress)}
            </span>
          )}
          {event.metadata.energy !== null && (
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "7px",
                fontWeight: 700,
                color: Number(event.metadata.energy) <= 3 ? "#7A1E1E" : "#807868",
              }}
            >
              E:{String(event.metadata.energy)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
