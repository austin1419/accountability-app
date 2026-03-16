// ─────────────────────────────────────────────
// ClientTimeline — unified coaching intelligence timeline
//
// Renders a vertical timeline with expand/collapse.
// Server component passes all events; the
// CollapsibleTimeline client wrapper handles state.
// ─────────────────────────────────────────────

import type { TimelineEvent } from "@/lib/coach/timeline/types";
import { CollapsibleTimeline } from "./CollapsibleTimeline";

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

  return <CollapsibleTimeline events={events} />;
}
