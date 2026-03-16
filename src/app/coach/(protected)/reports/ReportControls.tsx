"use client";

// ─────────────────────────────────────────────
// ReportControls — client selector + print button
// ─────────────────────────────────────────────

import { useRouter } from "next/navigation";

interface ReportControlsProps {
  clients: { id: string; name: string }[];
  selectedClientId: string;
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

export function ReportControls({ clients, selectedClientId }: ReportControlsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 print:hidden">
      {/* Client selector */}
      <select
        value={selectedClientId}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/coach/reports?client=${e.target.value}`);
          } else {
            router.push("/coach/reports");
          }
        }}
        className="rounded border border-[#1A1A1A]"
        style={{
          fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
          background: "#111111", padding: "7px 10px", outline: "none",
        }}
      >
        <option value="">Select a client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Print button */}
      {selectedClientId && (
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-[5px] uppercase transition-colors"
          style={{
            fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#F4EEE4", background: "#B8933A", padding: "7px 14px",
            cursor: "pointer", border: "none",
          }}
        >
          Print / Export PDF
        </button>
      )}
    </div>
  );
}
