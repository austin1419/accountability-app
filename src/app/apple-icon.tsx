import { ImageResponse } from "next/og";

export const size        = { width: 180, height: 180 };
export const contentType = "image/png";

// Generates /apple-icon — used when iOS users tap "Add to Home Screen"
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          180,
          height:         180,
          background:     "#2563eb",
          borderRadius:   36,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color:         "white",
            fontSize:      68,
            fontWeight:    800,
            lineHeight:    1,
            letterSpacing: "-0.02em",
          }}
        >
          P
        </span>
      </div>
    ),
    { width: 180, height: 180 },
  );
}
