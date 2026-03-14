import { AboutPulseButton } from "@/components/AboutPulseModal";

interface Props {
  name:      string;
  startDate: string;
  gender:    string | null;
  age:       number | null;
}

function formatGender(g: string): string {
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  if (g === "prefer_not_to_say") return "Prefer Not to Say";
  return g;
}

const metaLabel: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: 7, fontWeight: 700,
  letterSpacing: "0.15em", color: "#3A3020", textTransform: "uppercase",
  minWidth: 52,
};
const metaValue: React.CSSProperties = {
  fontFamily: "'EB Garamond', serif", fontSize: 12, color: "#4A3F2A",
};

export function ProfileHeader({ name, startDate, gender, age }: Props) {
  return (
    <header style={{ padding: "40px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>

        {/* Left — identity block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.2em", color: "#B8933A", textTransform: "uppercase",
            marginBottom: 4,
          }}>
            PULSE Profile
          </p>

          {/* Name */}
          <h1 style={{
            fontFamily: "'EB Garamond', serif", fontSize: 30, fontWeight: 600,
            color: "#F4EEE4", lineHeight: 1.05, margin: 0, marginBottom: 10,
          }}>
            {name}
          </h1>

          {/* Meta rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {gender && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={metaLabel}>Gender</span>
                <span style={metaValue}>{formatGender(gender)}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={metaLabel}>Age</span>
              <span style={metaValue}>{age != null ? age : "—"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={metaLabel}>Started</span>
              <span style={metaValue}>{startDate}</span>
            </div>
          </div>
        </div>

        {/* Right — PULSE logo button */}
        <div style={{ marginTop: 2 }}>
          <AboutPulseButton>
            <svg viewBox="0 0 100 100" fill="none" width={24} height={24}>
              <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={2.5} fill="none" opacity={0.5} />
              <polyline
                points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
                stroke="#B8933A" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="50" cy="50" r="4" fill="#B8933A" />
            </svg>
          </AboutPulseButton>
        </div>

      </div>
    </header>
  );
}
