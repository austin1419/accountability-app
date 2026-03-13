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
          background:     "#0D0D0D",
          borderRadius:   40,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          overflow:       "hidden",
        }}
      >
        <svg
          width={180}
          height={180}
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="256" cy="256" r="185" stroke="#B8933A" strokeWidth="22" fill="none" />
          <polyline
            points="86,256 156,256 178,256 200,148 222,368 242,256 250,256 256,110 262,256 270,256 290,180 312,332 334,256 356,256 426,256"
            stroke="#B8933A"
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 180, height: 180 },
  );
}
