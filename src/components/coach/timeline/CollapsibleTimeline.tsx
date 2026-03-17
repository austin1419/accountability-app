"use client";

// ─────────────────────────────────────────────
// CollapsibleTimeline — date-grouped, collapsible
//
// Groups events by date, shows first 5 date groups
// by default. "Show More" reveals the rest.
// ─────────────────────────────────────────────

import { useState } from "react";
import type { TimelineEvent } from "@/lib/coach/timeline/types";
import { TimelineEventCard } from "./TimelineEventCard";

const INITIAL_GROUPS = 5;
const cinzel = "'Cinzel', serif";

interface DateGroup {
  dateKey: string;
  label: string;
  events: TimelineEvent[];
}

function groupByDate(events: TimelineEvent[]): DateGroup[] {
  const map = new Map<string, TimelineEvent[]>();

  for (const e of events) {
    const dateKey = new Date(e.timestamp).toLocaleDateString("en-CA");
    const arr = map.get(dateKey) ?? [];
    arr.push(e);
    map.set(dateKey, arr);
  }

  // Sort groups by date descending
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, evts]) => ({
      dateKey,
      label: new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      events: evts,
    }));
}

interface CollapsibleTimelineProps {
  events: TimelineEvent[];
}

export function CollapsibleTimeline({ events }: CollapsibleTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const groups = groupByDate(events);
  const hasMore = groups.length > INITIAL_GROUPS;
  const visibleGroups = expanded ? groups : groups.slice(0, INITIAL_GROUPS);

  const hiddenGroupCount = groups.length - INITIAL_GROUPS;
  const hiddenEventCount = groups
    .slice(INITIAL_GROUPS)
    .reduce((sum, g) => sum + g.events.length, 0);

  return (
    <div>
      {visibleGroups.map((group) => (
        <div key={group.dateKey} className="mb-3 last:mb-0">
          {/* Date header */}
          <p
            className="mb-1.5"
            style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868" }}
          >
            {group.label}
          </p>
          {/* Events for this date */}
          <div className="relative pl-4 border-l border-[#1A1A1A]">
            {group.events.map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}

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
              : `Show More (${hiddenGroupCount} day${hiddenGroupCount !== 1 ? "s" : ""}, ${hiddenEventCount} event${hiddenEventCount !== 1 ? "s" : ""})`}
          </button>
        </div>
      )}
    </div>
  );
}
