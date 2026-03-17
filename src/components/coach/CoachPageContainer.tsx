// ─────────────────────────────────────────────
// CoachPageContainer — content padding wrapper
//
// Pure layout. No data, no queries, no hooks.
// ─────────────────────────────────────────────

export function CoachPageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1200px] px-6 py-6 lg:px-8">
      {children}
    </div>
  );
}
