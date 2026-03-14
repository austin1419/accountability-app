"use client";

// ─────────────────────────────────────────────
// CoachingProfilePanel — 8-tile coaching intake grid
//
// Computes tile statuses from saved coaching_profile_answers.
// Complete = ALL questions in the section answered.
// Overall progress bar = total answered / total questions.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SECTION_CONFIGS } from "@/lib/coachingProfile/questionConfig";
import { fetchAllCoachingAnswers } from "@/lib/coachingProfile/queries";
import type { TileStatus, SavedAnswers } from "@/lib/coachingProfile/types";
import { isAnswered } from "@/lib/utils/isAnswered";
import { CoachingProfileTile } from "./CoachingProfileTile";
import { CoachingProfileModal } from "./CoachingProfileModal";

export type TileProgress = {
  status:   TileStatus;
  answered: number;
  total:    number;
};

/** Short display labels for tiles — keyed by sectionKey */
const TILE_LABELS: Record<string, string> = {
  identity_life_context:  "Identity",
  health_history:         "Health",
  training_background:    "Training",
  nutrition_habits:       "Nutrition",
  lifestyle_recovery:     "Recovery",
  goals_vision:           "Goals",
  mindset_accountability: "Mindset",
  spirit_new_beginnings:  "Spirit",
};

// Uses shared isAnswered() — imported above

export function computeTileProgress(
  sectionKey: string,
  sectionAnswers: SavedAnswers | undefined,
): TileProgress {
  const config = SECTION_CONFIGS.find((s) => s.sectionKey === sectionKey);
  if (!config || config.questions.length === 0) {
    return { status: "not_started", answered: 0, total: 0 };
  }

  const total = config.questions.length;
  if (!sectionAnswers) return { status: "not_started", answered: 0, total };

  const answered = config.questions.filter(
    (q) => isAnswered(sectionAnswers[q.questionKey], q.inputType),
  ).length;

  if (answered === 0)    return { status: "not_started", answered, total };
  if (answered >= total) return { status: "complete",    answered, total };
  return { status: "in_progress", answered, total };
}

export function CoachingProfilePanel() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [allAnswers, setAllAnswers] = useState<Record<string, SavedAnswers>>({});

  // Resolve userId on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (profile) setUserId(profile.id);
    }
    init();
  }, []);

  // Load all answers when userId is available
  const loadAnswers = useCallback(async () => {
    if (!userId) return;
    const data = await fetchAllCoachingAnswers(userId);
    setAllAnswers(data);
  }, [userId]);

  useEffect(() => { loadAnswers(); }, [loadAnswers]);

  // Compute per-tile progress
  const tileProgresses = SECTION_CONFIGS.map((s) => ({
    config: s,
    progress: computeTileProgress(s.sectionKey, allAnswers[s.sectionKey]),
  }));

  // Aggregate overall progress
  const totalQuestions = tileProgresses.reduce((sum, t) => sum + t.progress.total, 0);
  const totalAnswered  = tileProgresses.reduce((sum, t) => sum + t.progress.answered, 0);
  const overallPct     = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  return (
    <>
      <section className="bg-[#141414] rounded p-5 border border-[#252525]">
        {/* Header */}
        <p
          className="text-xs uppercase tracking-widest text-[#9A9080] mb-3"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Coaching Profile
        </p>

        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-[#252525] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPct}%`,
                background: overallPct >= 100
                  ? "#4CAF50"
                  : "linear-gradient(90deg, #B8933A, #C9A44B)",
              }}
            />
          </div>
          <p className="text-xs text-[#807868] mt-1.5">
            <span className="text-[#DDD5C0] font-semibold">{overallPct}%</span> complete
            <span className="ml-1.5 text-[#5A5347]">·</span>
            <span className="ml-1.5">{totalAnswered} / {totalQuestions} answered</span>
          </p>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tileProgresses.map(({ config: s, progress }) => (
            <CoachingProfileTile
              key={s.sectionKey}
              title={TILE_LABELS[s.sectionKey] ?? s.title}
              status={progress.status}
              answered={progress.answered}
              total={progress.total}
              onClick={() => setOpenSection(s.sectionKey)}
            />
          ))}
        </div>
      </section>

      {openSection && userId && (
        <CoachingProfileModal
          sectionKey={openSection}
          userId={userId}
          onClose={() => setOpenSection(null)}
          onSaved={loadAnswers}
        />
      )}
    </>
  );
}
