"use client";

import type { TileStatus } from "@/lib/coachingProfile/types";

interface Props {
  title:    string;
  status:   TileStatus;
  answered: number;
  total:    number;
  onClick:  () => void;
}

export function CoachingProfileTile({ title, status, answered, total, onClick }: Props) {
  const borderColor = status === "complete" ? "#3A3020" : "#252525";
  const statusColor =
    status === "complete"    ? "#B8933A"
    : status === "in_progress" ? "#807868"
    : "#3A3020";
  const statusText =
    status === "complete"    ? "Complete"
    : status === "in_progress" ? "In Progress"
    : "Not Started";

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: "#0D0D0D", border: `1px solid ${borderColor}`, borderRadius: 8,
        padding: 12, cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 4,
      }}
    >
      {/* Form name */}
      <span style={{
        fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#DDD5C0",
      }}>
        {title}
      </span>

      {/* Status label */}
      <span style={{
        fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700,
        letterSpacing: "0.12em", color: statusColor, textTransform: "uppercase",
      }}>
        {statusText}
      </span>

      {/* Count for in-progress */}
      {status === "in_progress" && (
        <span style={{
          fontFamily: "'EB Garamond', serif", fontSize: 11, color: "#4A3F2A",
        }}>
          {answered} / {total} answered
        </span>
      )}
    </button>
  );
}
