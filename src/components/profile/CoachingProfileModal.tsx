"use client";

// ─────────────────────────────────────────────
// CoachingProfileModal — section form modal
//
// Uses sectionKey (not display title) for routing.
// If the section has questions defined in the config,
// renders the dynamic form. Otherwise shows a placeholder.
// ─────────────────────────────────────────────

import { getSectionConfig } from "@/lib/coachingProfile/questionConfig";
import { CoachingProfileForm } from "./CoachingProfileForm";

interface Props {
  sectionKey: string;
  userId:     string;
  onClose:    () => void;
  onSaved:    () => void;
}

export function CoachingProfileModal({ sectionKey, userId, onClose, onSaved }: Props) {
  const config = getSectionConfig(sectionKey);
  const hasQuestions = config && config.questions.length > 0;
  const displayTitle = config?.title ?? sectionKey;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg w-full max-w-md max-h-[85vh] overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg text-white mb-5"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {displayTitle}
        </h2>

        {hasQuestions ? (
          <CoachingProfileForm
            userId={userId}
            config={config}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : (
          <>
            <p className="text-sm text-[#807868]">
              Coaching profile form will appear here.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 rounded bg-[#252525] text-sm text-[#DDD5C0] hover:bg-[#2A2A2A] transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
