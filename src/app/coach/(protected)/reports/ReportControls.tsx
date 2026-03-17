"use client";

// ─────────────────────────────────────────────
// ReportControls — client selector + actions
// ─────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReportControlsProps {
  clients: { id: string; name: string }[];
  selectedClientId: string;
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

export function ReportControls({ clients, selectedClientId }: ReportControlsProps) {
  const router = useRouter();
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [sent, setSent] = useState(false);

  const selectedName = clients.find((c) => c.id === selectedClientId)?.name ?? "";

  return (
    <div className="flex items-center gap-2 print:hidden relative">
      {/* Client selector */}
      <select
        value={selectedClientId}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/coach/reports?client=${e.target.value}`);
          } else {
            router.push("/coach/reports");
          }
          setSent(false);
          setShowSendConfirm(false);
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

      {/* Generate / Print */}
      {selectedClientId && (
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-[5px] uppercase transition-colors"
          style={{
            fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#F4EEE4", background: "#B8933A", padding: "6px 12px",
            cursor: "pointer", border: "none",
          }}
        >
          Export PDF
        </button>
      )}

      {/* Send Report */}
      {selectedClientId && !sent && (
        <button
          type="button"
          onClick={() => setShowSendConfirm(!showSendConfirm)}
          className="rounded-[5px] uppercase transition-colors border"
          style={{
            fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#1D9E75", borderColor: "#0D3A25", background: "rgba(29,158,117,0.08)",
            padding: "5px 12px", cursor: "pointer",
          }}
        >
          Send to Client
        </button>
      )}

      {sent && (
        <span style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#1D9E75" }}>
          ✓ Report marked as sent
        </span>
      )}

      {/* Send confirmation dropdown */}
      {showSendConfirm && (
        <div
          className="absolute right-0 top-full mt-1 z-10 rounded-[7px] border border-[#0D3A25]"
          style={{ background: "#0D0D0D", padding: "12px 14px", width: "280px" }}
        >
          <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#1D9E75", textTransform: "uppercase", marginBottom: "6px" }}>
            Send report to {selectedName}
          </p>
          <textarea
            value={sendNote}
            onChange={(e) => setSendNote(e.target.value)}
            rows={2}
            placeholder="Optional message to include..."
            className="w-full rounded border border-[#1A1A1A] mb-2 resize-none"
            style={{
              fontFamily: ebGaramond, fontSize: "11px", color: "#DDD5C0",
              background: "#111111", padding: "6px 8px", outline: "none",
            }}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                // For beta: mark as sent (no email integration yet)
                setSent(true);
                setShowSendConfirm(false);
                setSendNote("");
              }}
              className="rounded border uppercase"
              style={{
                fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                color: "#1D9E75", borderColor: "#0D3A25", background: "rgba(29,158,117,0.08)",
                padding: "4px 10px", cursor: "pointer",
              }}
            >
              Confirm Send
            </button>
            <button
              type="button"
              onClick={() => setShowSendConfirm(false)}
              className="rounded border uppercase"
              style={{
                fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                color: "#4A3F2A", borderColor: "#1A1A1A", background: "transparent",
                padding: "4px 10px", cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
