// ─────────────────────────────────────────────
// ClientCard — Client grid card for /coach/clients
// ─────────────────────────────────────────────

import Link from "next/link";

type HealthFlag =
  | "low_readiness"
  | "recovery_deficit"
  | "high_stress_low_energy"
  | "sleep_deficit"
  | "nutrition_slip"
  | "training_gap";

const healthFlagLabels: Record<HealthFlag, string> = {
  low_readiness:          "Low Readiness",
  recovery_deficit:       "Recovery",
  high_stress_low_energy: "Stress",
  sleep_deficit:          "Sleep",
  nutrition_slip:         "Nutrition",
  training_gap:           "Training",
};

interface ClientCardProps {
  client: {
    id: string;
    name: string;
    goalName: string | null;
    goalProgress: number;
    currentWeight: number | null;
    todayPercent: number;
    weekPercent: number;
    monthPercent: number;
    isFlagged: boolean;
    healthFlags: HealthFlag[];
  };
  dimmed?: boolean;
}

function complianceColor(pct: number): string {
  if (pct >= 70) return "text-[#1D9E75]";
  if (pct >= 50) return "text-[#B8933A]";
  return "text-[#7A1E1E]";
}

function progressBarColor(pct: number): string {
  if (pct >= 70) return "bg-[#1D9E75]";
  if (pct >= 40) return "bg-[#B8933A]";
  return "bg-[#7A1E1E]";
}

export function ClientCard({ client, dimmed = false }: ClientCardProps) {
  const accent = client.isFlagged ? "#7A1E1E" : "#1A1A1A";

  return (
    <Link
      href={`/coach/clients/${client.id}`}
      className="group bg-[#0D0D0D] rounded-[6px] border border-[#1A1A1A] flex flex-col no-underline hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all duration-150"
      style={{
        borderLeft: `3px solid ${accent}`,
        padding: "10px 12px 8px",
        opacity: dimmed ? 0.65 : 1,
      }}
    >
      {/* ── Row 1: Name + status badge ───────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-baseline gap-2">
          <p
            className="text-[#DDD5C0] font-semibold truncate group-hover:text-[#F4EEE4] transition-colors"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "14px", lineHeight: 1.2 }}
          >
            {client.name}
          </p>
          {client.goalName && (
            <p
              className="text-[#807868] truncate hidden sm:block"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", lineHeight: 1.2 }}
            >
              {client.goalName}
            </p>
          )}
        </div>
        {client.isFlagged ? (
          <span
            className="text-[#7A1E1E] border border-[#2A1010] bg-[rgba(122,30,30,0.10)] px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 600 }}
          >
            Attention
          </span>
        ) : (
          <span
            className="text-[#1D9E75] border border-[#0D3A25] bg-[rgba(29,158,117,0.08)] px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 600 }}
          >
            On Track
          </span>
        )}
      </div>

      {/* ── Row 2: Goal progress bar (full width, prominent) ── */}
      {client.goalProgress > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[#807868]" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.08em" }}>
              GOAL
            </span>
            <span className="text-[#DDD5C0]" style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700 }}>
              {client.goalProgress}%
            </span>
          </div>
          <div className="h-[5px] bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progressBarColor(client.goalProgress)}`}
              style={{ width: `${Math.min(client.goalProgress, 100)}%`, transition: "width 0.4s ease" }}
            />
          </div>
        </div>
      )}

      {/* ── Row 3: Compliance stat row + weight ── */}
      <div className="flex items-baseline gap-3 mt-2">
        {[
          { label: "T", pct: client.todayPercent },
          { label: "7d", pct: client.weekPercent },
          { label: "30d", pct: client.monthPercent },
        ].map(({ label, pct }) => (
          <span key={label} className="flex items-baseline gap-0.5">
            <span
              className="text-[#4A3F2A]"
              style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.04em" }}
            >
              {label}
            </span>
            <span
              className={`font-semibold ${complianceColor(pct)}`}
              style={{ fontFamily: "'Cinzel', serif", fontSize: "11px" }}
            >
              {pct}%
            </span>
          </span>
        ))}
        {client.currentWeight != null && (
          <span className="flex items-baseline gap-0.5 ml-auto">
            <span className="text-[#807868]" style={{ fontFamily: "'Cinzel', serif", fontSize: "11px" }}>
              {client.currentWeight}
            </span>
            <span className="text-[#4A3F2A]" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px" }}>
              lb
            </span>
          </span>
        )}
      </div>

      {/* ── Row 4: Health flags (conditional) ──── */}
      {client.healthFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {client.healthFlags.map((flag) => (
            <span
              key={flag}
              className="text-[#C94A4A] border border-[#7A1E1E] bg-[rgba(122,30,30,0.06)] px-1.5 py-px rounded"
              style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 600, letterSpacing: "0.05em" }}
            >
              {healthFlagLabels[flag]}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
