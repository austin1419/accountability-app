// ─────────────────────────────────────────────
// Coach Loading State
//
// Minimal loading indicator shown during server
// data fetches. Covers all coach routes via the
// (protected) layout group.
// ─────────────────────────────────────────────

export default function CoachLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      {/* Pulsing dot */}
      <div
        className="rounded-full animate-pulse"
        style={{ width: "8px", height: "8px", background: "#B8933A" }}
      />
      <p
        className="mt-3 uppercase"
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "8px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#4A3F2A",
        }}
      >
        Loading
      </p>
    </div>
  );
}
