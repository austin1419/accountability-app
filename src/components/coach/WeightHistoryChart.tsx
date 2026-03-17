// ─────────────────────────────────────────────
// WeightHistoryChart — simple SVG line chart
//
// Server component. Renders weight data as a
// minimal line chart. No JS interactivity needed.
// ─────────────────────────────────────────────

interface WeightPoint {
  date: string;
  weight: number;
}

interface WeightHistoryChartProps {
  data: WeightPoint[];
}

const W = 300;
const H = 80;
const PAD = { top: 8, right: 8, bottom: 16, left: 32 };

export function WeightHistoryChart({ data }: WeightHistoryChartProps) {
  if (data.length < 2) {
    return (
      <div className="border border-[#1A1A1A] rounded-[5px] bg-[#0A0A0A] py-6 px-4 text-center">
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
          Not enough weight data for chart.
        </p>
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Map data points to SVG coordinates
  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.weight - minW) / range) * chartH,
    weight: d.weight,
    date: d.date,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Gradient area fill
  const areaPath = `M ${points[0].x},${PAD.top + chartH} ` +
    points.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x},${PAD.top + chartH} Z`;

  // Y-axis labels (min, mid, max)
  const midW = (minW + maxW) / 2;
  const yLabels = [
    { val: maxW, y: PAD.top },
    { val: midW, y: PAD.top + chartH / 2 },
    { val: minW, y: PAD.top + chartH },
  ];

  // X-axis labels (first and last date)
  const firstDate = data[0].date;
  const lastDate = data[data.length - 1].date;
  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Trend direction
  const firstWeight = data[0].weight;
  const lastWeight = data[data.length - 1].weight;
  const trendColor = lastWeight < firstWeight ? "#1D9E75" : lastWeight > firstWeight ? "#7A1E1E" : "#B8933A";

  return (
    <div className="border border-[#1A1A1A] rounded-[5px] bg-[#0A0A0A] overflow-hidden" style={{ padding: "8px 4px 4px" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <line key={i} x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y} stroke="#1A1A1A" strokeWidth={0.5} />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={trendColor} opacity={0.08} />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={trendColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={trendColor} />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((l, i) => (
          <text
            key={i}
            x={PAD.left - 4}
            y={l.y + 3}
            textAnchor="end"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "6px", fill: "#4A3F2A" }}
          >
            {Math.round(l.val)}
          </text>
        ))}

        {/* X-axis labels */}
        <text
          x={PAD.left}
          y={H - 2}
          textAnchor="start"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "5px", fill: "#4A3F2A" }}
        >
          {fmtDate(firstDate)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 2}
          textAnchor="end"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "5px", fill: "#4A3F2A" }}
        >
          {fmtDate(lastDate)}
        </text>
      </svg>
    </div>
  );
}
