"use client";

// ─────────────────────────────────────────────
// CoachingProfileModal — placeholder modal
//
// Displays the section title with a placeholder message.
// Will house the intake form in a future pass.
// ─────────────────────────────────────────────

interface Props {
  title: string;
  onClose: () => void;
}

export function CoachingProfileModal({ title, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg text-white mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {title}
        </h2>

        <p className="text-sm text-[#807868]">
          Coaching profile form will appear here.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded bg-[#252525] text-sm text-[#DDD5C0] hover:bg-[#2A2A2A] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
