export function BadgesCard() {
  return (
    <section style={{
      background: "#141414", border: "1px solid #252525", borderRadius: 10,
      padding: "14px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{
        fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.2em", color: "#4A3F2A", textTransform: "uppercase",
      }}>
        Badges
      </span>
      <span style={{
        fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
        fontSize: 13, color: "#3A3020",
      }}>
        Coming soon
      </span>
    </section>
  );
}
