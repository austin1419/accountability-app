// ─────────────────────────────────────────────
// PriorityStrip — Pinned alert strip (top 4)
// ─────────────────────────────────────────────

interface Alert {
  client_id: string;
  client_name: string;
  alert_type: string;
  alert_priority: number;
  alert_message: string;
  detail_value: string | null;
}

interface PriorityStripProps {
  alerts: Alert[];
}

function dotColor(priority: number): string {
  if (priority <= 1) return "bg-[#7A1E1E]";
  if (priority <= 3) return "bg-[#B8933A]";
  return "bg-[#807868]";
}

export function PriorityStrip({ alerts }: PriorityStripProps) {
  const top4 = [...alerts].sort((a, b) => a.alert_priority - b.alert_priority).slice(0, 4);

  return (
    <div
      className="w-full border-b border-[#1A1A1A] flex items-center gap-6 overflow-hidden"
      style={{ background: "#060606", padding: "5px 18px" }}
    >
      {top4.length === 0 ? (
        <span
          className="text-[#4A3F2A]"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic" }}
        >
          No alerts today.
        </span>
      ) : (
        top4.map((a, i) => (
          <div key={`${a.client_id}-${a.alert_type}-${i}`} className="flex items-center gap-2 min-w-0">
            <div className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${dotColor(a.alert_priority)}`} />
            <span
              className="text-[#DDD5C0] truncate"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px" }}
            >
              <span className="font-semibold">{a.client_name}</span>
              <span className="text-[#807868]"> — </span>
              <span className="text-[#807868]">{a.alert_type.replace(/_/g, " ")}</span>
            </span>
          </div>
        ))
      )}
    </div>
  );
}
