"use client";

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

const card: React.CSSProperties = {
  background: "#141414", border: "1px solid #252525", borderRadius: 10,
  padding: 16,
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.2em", color: "#4A3F2A", textTransform: "uppercase",
  margin: 0,
};

export function CoachingProfilePanel() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [allAnswers, setAllAnswers] = useState<Record<string, SavedAnswers>>({});

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

  const loadAnswers = useCallback(async () => {
    if (!userId) return;
    const data = await fetchAllCoachingAnswers(userId);
    setAllAnswers(data);
  }, [userId]);

  useEffect(() => { loadAnswers(); }, [loadAnswers]);

  const tileProgresses = SECTION_CONFIGS.map((s) => ({
    config: s,
    progress: computeTileProgress(s.sectionKey, allAnswers[s.sectionKey]),
  }));

  const totalQuestions = tileProgresses.reduce((sum, t) => sum + t.progress.total, 0);
  const totalAnswered  = tileProgresses.reduce((sum, t) => sum + t.progress.answered, 0);
  const overallPct     = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  return (
    <>
      <section style={card}>
        {/* Completion row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={sectionLabelStyle}>Completion</span>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.1em", color: "#B8933A",
          }}>
            {overallPct}%
          </span>
        </div>

        {/* Completion track */}
        <div style={{ height: 4, background: "#252525", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
          <div style={{
            height: 4, background: "#B8933A", borderRadius: 2,
            width: `${overallPct}%`, transition: "width 0.5s ease",
          }} />
        </div>

        {/* Meta line */}
        <p style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 12, color: "#4A3F2A", margin: 0, marginBottom: 14,
        }}>
          {totalAnswered} / {totalQuestions} answered
        </p>

        {/* Forms grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
