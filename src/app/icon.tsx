import { ImageResponse } from "next/og";

// Generates /icon/192 and /icon/512 — referenced by manifest.ts
export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = id === "512" ? 512 : 192;
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.38);

  return new ImageResponse(
    (
      <div
        style={{
          width:           size,
          height:          size,
          background:      "#2563eb",
          borderRadius:    radius,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
        }}
      >
        <span
          style={{
            color:      "white",
            fontSize:   fontSize,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          P
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
