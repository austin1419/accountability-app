// ─────────────────────────────────────────────
// ClientTrendList — ranked list of clients by trend
// ─────────────────────────────────────────────

import { SectionHeader } from "./SectionHeader";

interface ClientTrendItem {
  id: string;
  name: string;
  value: number;
  delta: number;
  statusColor: string;
}

interface ClientTrendListProps {
  title: string;
  subtitle?: string;
  clients: ClientTrendItem[];
  emptyMessage: string;
  accent: "green" | "crimson";
}

const borderColors = {
  green: "#0D3A25",
  crimson: "#2A1010",
};

export function ClientTrendList({ title, subtitle, clients, emptyMessage, accent }: ClientTrendListProps) {
  return (
    <div
      className="rounded-[7px] border border-[#1A1A1A]"
      style={{ background: "#0D0D0D", padding: "16px 20px" }}
    >
      <SectionHeader title={title} subtitle={subtitle} />

      {clients.length === 0 ? (
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {clients.map((client, idx) => (
            <a
              key={client.id}
              href={`/coach/clients/${client.id}`}
              className="flex items-center gap-3 rounded-[5px] border px-3 py-2 no-underline transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              style={{ borderColor: borderColors[accent], background: "transparent" }}
            >
              {/* Rank */}
              <span
                style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, color: "#4A3F2A", minWidth: "14px" }}
              >
                {idx + 1}
              </span>

              {/* Name */}
              <span
                className="flex-1 truncate"
                style={{ fontFamily: "'EB Garamond', serif", fontSize: "13px", fontWeight: 600, color: "#DDD5C0" }}
              >
                {client.name}
              </span>

              {/* 30d value */}
              <span
                style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700, color: client.statusColor }}
              >
                {client.value}%
              </span>

              {/* Delta arrow */}
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: client.delta >= 0 ? "#1D9E75" : "#7A1E1E",
                  minWidth: "36px",
                  textAlign: "right",
                }}
              >
                {client.delta >= 0 ? "+" : ""}{client.delta}%
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
