"use client";

// ─────────────────────────────────────────────
// CollapsibleTimeline — expand/collapse wrapper
//
// Shows first 10 events by default. "Show More"
// reveals the rest; "Show Less" collapses back.
// ─────────────────────────────────────────────

import { useState } from "react";
import type { TimelineEvent } from "@/lib/coach/timeline/types";
import { TimelineEventCard } from "./TimelineEventCard";

const INITIAL_COUNT = 10;
const cinzel = "'Cinzel', serif";

interface CollapsibleTimelineProps {
  events: TimelineEvent[];
}

export function CollapsibleTimeline({ events }: CollapsibleTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = events.length > INITIAL_COUNT;
  const visible = expanded ? events : events.slice(0, INITIAL_COUNT);

  return (
    <div>
      <div className="relative pl-4 border-l border-[#1A1A1A]">
        {visible.map((event) => (
          <TimelineEventCard key={event.id} event={event} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="uppercase transition-colors hover:text-[#B8933A]"
            style={{
              fontFamily: cinzel,
              fontSize: "8px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#4A3F2A",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            {expanded
              ? "Show Less"
              : `Show More (${events.length - INITIAL_COUNT} more)`}
          </button>
        </div>
      )}
    </div>
  );
}
