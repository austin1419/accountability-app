"use client";

// ─────────────────────────────────────────────
// CoachingProfileTile — single intake section tile
//
// Renders title + status label with border/text color
// driven by the tile's current status.
// Shows "X / Y answered" for in-progress sections.
// ─────────────────────────────────────────────

import type { TileStatus } from "@/lib/coachingProfile/types";

interface Props {
  title:    string;
  status:   TileStatus;
  answered: number;
  total:    number;
  onClick:  () => void;
}

const STATUS_CONFIG: Record<TileStatus, { color: string; border: string }> = {
  not_started: { color: "#807868", border: "#2A2A2A" },
  in_progress: { color: "#B8933A", border: "#B8933A" },
  complete:    { color: "#4CAF50", border: "#4CAF50" },
};

function statusLabel(status: TileStatus, answered: number, total: number): string {
  if (status === "not_started") return "Not Started";
  if (status === "complete")    return "Complete";
  return `${answered} / ${total} answered`;
}

export function CoachingProfileTile({ title, status, answered, total, onClick }: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1B1B1B] rounded-lg p-4 border shadow-sm
                 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
                 hover:border-[#444] active:translate-y-0"
      style={{ borderColor: cfg.border }}
    >
      <p
        className="text-sm text-white leading-snug mb-2"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {title}
      </p>
      <p className="text-xs font-medium" style={{ color: cfg.color }}>
        {statusLabel(status, answered, total)}
      </p>
    </button>
  );
}
