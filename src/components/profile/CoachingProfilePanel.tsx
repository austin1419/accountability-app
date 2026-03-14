"use client";

// ─────────────────────────────────────────────
// CoachingProfilePanel — 8-tile coaching intake grid
//
// Computes tile statuses from saved coaching_profile_answers.
// Complete = ALL questions in the section answered.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SECTION_CONFIGS } from "@/lib/coachingProfile/questionConfig";
import { fetchAllCoachingAnswers } from "@/lib/coachingProfile/queries";
import type { TileStatus, SavedAnswers } from "@/lib/coachingProfile/types";
import { CoachingProfileTile } from "./CoachingProfileTile";
import { CoachingProfileModal } from "./CoachingProfileModal";

export type TileProgress = {
  status:   TileStatus;
  answered: number;
  total:    number;
};

function isNonEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

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
    (q) => isNonEmpty(sectionAnswers[q.questionKey]),
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

  const completed = SECTION_CONFIGS.filter(
    (s) => computeTileProgress(s.sectionKey, allAnswers[s.sectionKey]).status === "complete",
  ).length;

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
            <span className="font-semibold text-[#DDD5C0]">{completed}</span> / {SECTION_CONFIGS.length} complete
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SECTION_CONFIGS.map((s) => {
            const progress = computeTileProgress(s.sectionKey, allAnswers[s.sectionKey]);
            return (
              <CoachingProfileTile
                key={s.sectionKey}
                title={s.title}
                status={progress.status}
                answered={progress.answered}
                total={progress.total}
                onClick={() => setOpenSection(s.title)}
              />
            );
          })}
        </div>
      </section>

      {openSection && userId && (
        <CoachingProfileModal
          title={openSection}
          userId={userId}
          onClose={() => setOpenSection(null)}
          onSaved={loadAnswers}
        />
      )}
    </>
  );
}
