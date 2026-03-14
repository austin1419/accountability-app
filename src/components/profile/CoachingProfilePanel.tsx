"use client";

// ─────────────────────────────────────────────
// CoachingProfilePanel — 8-tile coaching intake grid
//
// Visual shell only. Tile statuses are hardcoded for
// design review. Will be driven by DB state in a future pass.
// ─────────────────────────────────────────────

import { useState } from "react";
import { CoachingProfileTile, type TileStatus } from "./CoachingProfileTile";
import { CoachingProfileModal } from "./CoachingProfileModal";

type Section = { title: string; status: TileStatus };

const SECTIONS: Section[] = [
  { title: "Identity & Life Context",   status: "not_started" },
  { title: "Health History",             status: "not_started" },
  { title: "Training Background",        status: "not_started" },
  { title: "Nutrition Habits",           status: "in_progress" },
  { title: "Lifestyle & Recovery",       status: "in_progress" },
  { title: "Goals & Vision",             status: "complete" },
  { title: "Mindset & Accountability",   status: "complete" },
  { title: "Spirit & New Beginnings",    status: "complete" },
];

export function CoachingProfilePanel() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const completed = SECTIONS.filter((s) => s.status === "complete").length;

  return (
    <>
      <section className="bg-[#141414] rounded p-5 border border-[#252525]">
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-xs uppercase tracking-widest text-[#9A9080]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Coaching Profile
          </p>
          <p className="text-xs text-[#9A9080]">
            <span className="font-semibold text-[#DDD5C0]">{completed}</span> / {SECTIONS.length} complete
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SECTIONS.map((s) => (
            <CoachingProfileTile
              key={s.title}
              title={s.title}
              status={s.status}
              onClick={() => setOpenSection(s.title)}
            />
          ))}
        </div>
      </section>

      {openSection && (
        <CoachingProfileModal
          title={openSection}
          onClose={() => setOpenSection(null)}
        />
      )}
    </>
  );
}
