// ─────────────────────────────────────────────
// ClientTimeline — unified coaching intelligence timeline
//
// Server component. Renders a vertical timeline of
// events from multiple data sources, sorted by
// timestamp descending.
// ─────────────────────────────────────────────

import type { TimelineEvent } from "@/lib/coach/timeline/types";
import { TimelineEventCard } from "./TimelineEventCard";

interface ClientTimelineProps {
  events: TimelineEvent[];
}

export function ClientTimeline({ events }: ClientTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] py-5 px-4 text-center">
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          No timeline events yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-4 border-l border-[#1A1A1A]">
      {events.map((event) => (
        <TimelineEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
