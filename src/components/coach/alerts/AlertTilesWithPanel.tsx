"use client";

// ─────────────────────────────────────────────
// AlertTilesWithPanel — client wrapper for tile click + panel
//
// Manages open/close/filter state for the drill-down panel.
// Receives all data as serialized props from the server page.
// Only this component is a client component.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { AlertDrillDownPanel } from "./AlertDrillDownPanel";
import type { DrillDownFilter } from "./AlertDrillDownPanel";
import type { DrillDownRowData } from "./AlertDrillDownRow";

interface TileData {
  filter: DrillDownFilter;
  label: string;
  count: number;
  accent: "crimson" | "gold" | "green" | "neutral";
  subtext?: string;
}

interface AlertTilesWithPanelProps {
  tiles: TileData[];
  /** Pre-built rows keyed by filter */
  rowsByFilter: Record<DrillDownFilter, DrillDownRowData[]>;
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

const accentMap = {
  crimson: { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.10)" },
  gold:    { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.08)" },
  green:   { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.08)" },
  neutral: { text: "#807868", border: "#1A1A1A", bg: "#0D0D0D" },
};

const activeRing = "#B8933A";

export function AlertTilesWithPanel({ tiles, rowsByFilter }: AlertTilesWithPanelProps) {
  const [activeFilter, setActiveFilter] = useState<DrillDownFilter | null>(null);

  const close = useCallback(() => setActiveFilter(null), []);

  // Escape key closes panel
  useEffect(() => {
    if (!activeFilter) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeFilter, close]);

  function handleTileClick(filter: DrillDownFilter) {
    // Toggle same tile closes, different tile swaps
    setActiveFilter((prev) => (prev === filter ? null : filter));
  }

  return (
    <>
      {/* ── Summary Tiles ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-[9px] mb-6">
        {tiles.map((tile) => {
          const a = accentMap[tile.accent];
          const isActive = activeFilter === tile.filter;

          return (
            <button
              key={tile.filter}
              type="button"
              onClick={() => handleTileClick(tile.filter)}
              className="rounded-[7px] border flex flex-col items-center justify-center transition-all"
              style={{
                background: a.bg,
                borderColor: isActive ? activeRing : a.border,
                padding: "14px 16px",
                cursor: "pointer",
                outline: "none",
                boxShadow: isActive ? `0 0 0 1px ${activeRing}` : "none",
              }}
            >
              <span
                style={{ fontFamily: cinzel, fontSize: "22px", fontWeight: 900, color: a.text, lineHeight: 1 }}
              >
                {tile.count}
              </span>
              <span
                className="mt-1 uppercase"
                style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: isActive ? activeRing : "#807868" }}
              >
                {tile.label}
              </span>
              {tile.subtext && (
                <span
                  className="mt-0.5"
                  style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}
                >
                  {tile.subtext}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Drill-down Panel ──────────────────────── */}
      {activeFilter && (
        <AlertDrillDownPanel
          filter={activeFilter}
          rows={rowsByFilter[activeFilter]}
          onClose={close}
        />
      )}
    </>
  );
}
